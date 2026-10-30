import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { isProductSalesDate, normalizeProductSearch, summarizeProductSales } from '../product-sales'
import { fetchDailyProductSales } from '../product-sales-server'

describe('product sales', () => {
  it('sums both item formats and historical prices without merging different product IDs', () => {
    const products = summarizeProductSales([
      { payment_status: 'paid', items: [{ menu_item_id: 'coffee', name: 'Cafe', quantity: 2, price: 3 }, { item_id: 'other', name: 'Cafe', qty: 1, price: 4 }] },
      { payment_status: 'paid', items: [{ item_id: 'coffee', name: 'Cafe', qty: 1, price: 2.5 }] },
    ])
    expect(products).toEqual([
      { key: 'id:coffee', name: 'Cafe', quantity: 3, amount: 8.5 },
      { key: 'id:other', name: 'Cafe', quantity: 1, amount: 4 },
    ])
  })

  it.each(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado', ' CANCELLED '])('excludes paid but cancelled orders (%s)', status => {
    expect(summarizeProductSales([{ status, payment_status: 'paid', items: [{ name: 'Cafe', qty: 2, price: 3 }] }])).toEqual([])
  })

  it('ignores unpaid orders and malformed lines, preserves free items and rounds prices', () => {
    expect(summarizeProductSales([
      { payment_status: 'pending', items: [{ name: 'Cafe', qty: 50, price: 3 }] },
      { payment_status: 'paid', items: 'bad data' },
      { payment_status: 'paid', items: [null, { name: 'Zero', qty: 0, price: 3 }, { name: 'Bad', qty: -1, price: 3 }, { name: 'Bad', qty: 1, price: 'bad' }, { name: 'Free', qty: 1, price: 0 }, { name: 'Tea', qty: 3, price: .1 }] },
    ])).toEqual([{ key: 'name:tea', name: 'Tea', quantity: 3, amount: .3 }, { key: 'name:free', name: 'Free', quantity: 1, amount: 0 }])
  })

  it('groups legacy names safely and supports accent-insensitive search', () => {
    const products = summarizeProductSales([{ payment_status: 'paid', items: [{ name: 'Café con leche', price: 2 }, { name: 'cafe con leche', quantity: '2', price: '2' }, { name: '__proto__', price: 1 }] }])
    expect(products[0]).toMatchObject({ quantity: 3, amount: 6 })
    expect(products.filter(product => normalizeProductSearch(product.name).includes(normalizeProductSearch('CAFE')))).toHaveLength(1)
    expect(products).toHaveLength(2)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-1-01', '', 'no date'])('rejects invalid dates (%s)', date => {
    expect(isProductSalesDate(date)).toBe(false)
  })

  it.each([
    ['2026-10-25', '2026-10-24T22:00:00.000Z', '2026-10-25T23:00:00.000Z'],
    ['2026-03-29', '2026-03-28T23:00:00.000Z', '2026-03-29T22:00:00.000Z'],
  ])('uses local midnight, including daylight saving changes (%s)', async (date, start, end) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]))
    const client = createClient('https://example.supabase.co', 'test', { auth: { persistSession: false }, global: { fetch: fetcher } })
    expect(await fetchDailyProductSales(client, 'tenant', date, 'Europe/Madrid')).toEqual([])
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.searchParams.get('tenant_id')).toBe('eq.tenant')
    expect(url.searchParams.get('payment_status')).toBe('eq.paid')
    expect(url.searchParams.getAll('created_at')).toEqual([`gte.${start}`, `lt.${end}`])
  })

  it('paginates past 1000 orders and never returns partial totals after an error', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 1000 }, () => ({ payment_status: 'paid', items: [{ name: 'Cafe', qty: 1, price: 3 }] }))))
      .mockResolvedValueOnce(Response.json([{ payment_status: 'paid', items: [{ name: 'Cafe', qty: 2, price: 3 }] }]))
    const client = createClient('https://example.supabase.co', 'test', { auth: { persistSession: false }, global: { fetch: fetcher } })
    expect(await fetchDailyProductSales(client, 'tenant', '2026-10-30', 'Europe/Madrid')).toEqual([{ key: 'name:cafe', name: 'Cafe', quantity: 1002, amount: 3006 }])
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('offset')).toBe('1000')
    expect(fetcher.mock.calls[0][1]?.signal).toBe(fetcher.mock.calls[1][1]?.signal)
    fetcher.mockReset()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 1000 }, () => ({ payment_status: 'paid', items: [] }))))
      .mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
    await expect(fetchDailyProductSales(client, 'tenant', '2026-10-30', 'Europe/Madrid')).rejects.toMatchObject({ message: 'Unavailable' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
