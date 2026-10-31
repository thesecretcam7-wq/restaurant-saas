import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { calculateCashClosingStatsByMode, calculateCurrentCashClosingStats, calculatePendingPreviousCashClosingStats } from '../cash-closing-server'

const clientFor = (fetcher: typeof fetch) => createClient('https://example.supabase.co', 'test', {
  auth: { persistSession: false }, global: { fetch: fetcher },
})
const settings = { timezone: 'UTC', country: 'ES', operating_hours: null }
const sale = (id: string, created_at: string, extra = {}) => ({
  id, created_at, total: 10, payment_status: 'paid', status: 'completed', payment_method: 'cash', ...extra,
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('cash closing bounded reads', () => {
  it('uses a tenant-scoped anti-join, preserves split payments and open bills', async () => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      const url = new URL(String(input))
      expect(url.searchParams.get('tenant_id')).toBe('eq.tenant')
      if (url.pathname.endsWith('/restaurant_settings')) return Response.json(settings)
      if (url.pathname.endsWith('/cash_closings')) return Response.json(null)
      if (url.pathname.endsWith('/cash_bill_payments')) return Response.json([{ id: 'bill', amount: 2 }])
      expect(url.pathname).toBe('/rest/v1/orders')
      expect(url.searchParams.get('select')).toContain('cash_closing_items()')
      expect(url.searchParams.get('cash_closing_items')).toBe('is.null')
      expect(url.searchParams.get('cash_closing_items.tenant_id')).toBe('eq.tenant')
      expect(url.searchParams.get('order')).toBe('created_at.asc,id.asc')
      return Response.json([
        sale('mixed', new Date().toISOString(), { payment_breakdown: [{ method: 'cash', amount: 4 }, { method: 'stripe', amount: 6 }] }),
        sale('cancelled', new Date().toISOString(), { status: 'cancelled' }),
        sale('unpaid', new Date().toISOString(), { payment_status: 'pending' }),
      ])
    })
    const stats = await calculateCurrentCashClosingStats(clientFor(fetcher), 'tenant')
    expect(stats).toMatchObject({ cashSales: 4, cardSales: 6, totalSales: 10, billPaymentsTotal: 2, transactionCount: 1, ordersCancelled: 1 })
    expect(stats.closingOrders.map(order => order.id)).toEqual(['mixed'])
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('returns no pending closing with just two reads when all historical orders are closed', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(settings))
      .mockResolvedValueOnce(Response.json([]))
    expect(await calculatePendingPreviousCashClosingStats(clientFor(fetcher), 'tenant')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps the oldest unclosed period and excludes later pending sales from that closing', async () => {
    const old = new Date(Date.now() - 4 * 86400000).toISOString()
    const newer = new Date(Date.now() - 2 * 86400000).toISOString()
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(settings))
      .mockResolvedValueOnce(Response.json([sale('old', old), sale('newer', newer)]))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([]))
    const stats = await calculatePendingPreviousCashClosingStats(clientFor(fetcher), 'tenant')
    expect(stats?.closingOrders.map(order => order.id)).toEqual(['old'])
    expect(stats?.totalSales).toBe(10)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('paginates open orders beyond 1000 without extra closed-ID queries or partial totals', async () => {
    const page = Array.from({ length: 1000 }, (_, i) => sale(String(i), new Date().toISOString()))
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(settings))
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json([sale('last', new Date().toISOString())]))
      .mockResolvedValueOnce(Response.json([]))
    const stats = await calculateCurrentCashClosingStats(clientFor(fetcher), 'tenant')
    expect(stats.transactionCount).toBe(1001)
    expect(stats.totalSales).toBe(10010)
    expect(new URL(String(fetcher.mock.calls[3][0])).searchParams.get('offset')).toBe('1000')
    fetcher.mockReset()
      .mockResolvedValueOnce(Response.json(settings))
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(Response.json(page))
      .mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
    await expect(calculateCurrentCashClosingStats(clientFor(fetcher), 'tenant')).rejects.toMatchObject({ message: 'Unavailable' })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('propagates request cancellation to the active fetch and starts no later queries', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>((_input, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      controller.abort()
    }))
    await expect(calculateCashClosingStatsByMode(clientFor(fetcher), 'tenant', 'pending', controller.signal)).rejects.toBeTruthy()
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('fails before reading orders when the latest closing cannot be read', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(settings))
      .mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
    await expect(calculateCurrentCashClosingStats(clientFor(fetcher), 'tenant')).rejects.toMatchObject({ message: 'Unavailable' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('shares a total deadline across sequential reads rather than restarting the budget each time', async () => {
    vi.useFakeTimers()
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), ms)
      return controller.signal
    })
    const fetcher = vi.fn<typeof fetch>((input, options) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(Response.json(String(input).includes('restaurant_settings') ? settings : null)), 7_000)
      options?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) })
    }))
    const result = calculateCashClosingStatsByMode(clientFor(fetcher), 'tenant', 'current').catch(error => error)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await result).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher.mock.calls[2][1]?.signal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
