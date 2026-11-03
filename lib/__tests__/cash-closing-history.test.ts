import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { fetchMonthCashClosings } from '../cash-closing-history'

const client = (fetcher: typeof fetch) => createClient('https://example.supabase.co', 'fixture', {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
})

describe('month closing history', () => {
  it('filters by tenant and local month bounds, and reads past the first page', async () => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      const url = new URL(String(input))
      expect(url.searchParams.get('tenant_id')).toBe('eq.tenant')
      expect(url.searchParams.getAll('closed_at')).toEqual(['gte.2026-09-30T22:00:00Z', 'lt.2026-10-31T23:00:00Z'])
      expect(url.searchParams.get('order')).toBe('closed_at.desc,id.asc')
      const offset = Number(url.searchParams.get('offset') || 0)
      return Response.json(Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({ id: String(offset + i), total_sales: 1 })))
    })
    const rows = await fetchMonthCashClosings(client(fetcher), 'tenant', '2026-09-30T22:00:00Z', '2026-10-31T23:00:00Z', new AbortController().signal)
    expect(rows).toHaveLength(1001)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('throws instead of returning partial history when a later page fails', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }))))
      .mockResolvedValueOnce(Response.json({ message: 'History unavailable' }, { status: 400 }))
    await expect(fetchMonthCashClosings(client(fetcher), 'tenant', '2026-10-01', '2026-11-01', new AbortController().signal)).rejects.toMatchObject({ message: 'History unavailable' })
  })

  it('honors cancellation when the user changes month', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(fetchMonthCashClosings(client(fetcher), 'tenant', '2026-10-01', '2026-11-01', AbortSignal.abort())).rejects.toBeTruthy()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
