import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { fetchSalesHistoryTotals } from '../sales-history-server'

const clientFor = (fetcher: typeof fetch) => createClient('https://example.supabase.co', 'test', {
  auth: { persistSession: false }, global: { fetch: fetcher },
})
describe('historical sales aggregate', () => {
  it('requests exact totals for one tenant without downloading historical rows', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ total_revenue: '12345.67', sale_count: 2501 }))
    expect(await fetchSalesHistoryTotals(clientFor(fetcher), 'tenant')).toEqual({ revenue: 12345.67, count: 2501 })
    expect(String(fetcher.mock.calls[0][0])).toContain('/rpc/get_sales_history_totals')
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ p_tenant_id: 'tenant' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('reports a database failure instead of showing zero sales or retrying', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ message: 'Unavailable' }, { status: 503 }))
    await expect(fetchSalesHistoryTotals(clientFor(fetcher), 'tenant')).rejects.toMatchObject({ message: 'Unavailable' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('rejects missing or malformed totals', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ total_revenue: 'bad', sale_count: 2 }))
    await expect(fetchSalesHistoryTotals(clientFor(fetcher), 'tenant')).rejects.toThrow('totales históricos')
  })
})
