import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { ensureInventoryItemForMenuItem } from '../inventory-sync'

describe('product inventory synchronization', () => {
  it('passes the timeout signal to both the lookup and insert using the real SDK builders', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ id: 'inventory-1' }))
    const client = createClient('https://example.supabase.co', 'test-service-key', {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
    })
    const signal = new AbortController().signal
    const result = await ensureInventoryItemForMenuItem(client, {
      tenantId: 'tenant-1', productId: 'product-1', productName: 'Pan', signal,
    })
    expect(result.id).toBe('inventory-1')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.every(([, init]) => init?.signal === signal)).toBe(true)
    expect(fetcher.mock.calls[1][1]?.method).toBe('POST')
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({ product_id: 'product-1', tenant_id: 'tenant-1' })
  })
})
