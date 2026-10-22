import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { fetchClosedMonthOrderIds } from '../closed-month-orders'

function clientWith(fetch: typeof globalThis.fetch) {
  return createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  })
}

describe('fetchClosedMonthOrderIds', () => {
  it('scopes the join to the tenant and month, paginates and deduplicates links', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 1000 }, () => ({ order_id: 'closed' }))))
      .mockResolvedValueOnce(Response.json([{ order_id: 'another' }, { order_id: null }]))
    const ids = await fetchClosedMonthOrderIds(clientWith(fetch), 'tenant', '2026-09-30T22:00:00Z')
    expect([...ids]).toEqual(['closed', 'another'])
    expect(fetch).toHaveBeenCalledTimes(2)
    const urls = fetch.mock.calls.map(([url]) => new URL(String(url)))
    expect(urls[0].searchParams.get('select')).toBe('order_id,orders!inner(created_at)')
    expect(urls[0].searchParams.get('tenant_id')).toBe('eq.tenant')
    expect(urls[0].searchParams.get('orders.tenant_id')).toBe('eq.tenant')
    expect(urls[0].searchParams.get('orders.created_at')).toBe('gte.2026-09-30T22:00:00Z')
    expect(urls[1].searchParams.get('offset')).toBe('1000')
    expect(fetch.mock.calls[0][1]?.signal).toBe(fetch.mock.calls[1][1]?.signal)
  })

  it('fails without returning a partial or zero balance and does not retry', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 1000 }, () => ({ order_id: 'closed' }))))
      .mockResolvedValueOnce(Response.json({ message: 'Unavailable' }, { status: 503 }))
    await expect(fetchClosedMonthOrderIds(clientWith(fetch), 'tenant', '2026-10-01')).rejects.toMatchObject({ message: 'Unavailable' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns an empty set when no sales have been closed', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json([]))
    expect((await fetchClosedMonthOrderIds(clientWith(fetch), 'tenant', '2026-10-01')).size).toBe(0)
  })
})
