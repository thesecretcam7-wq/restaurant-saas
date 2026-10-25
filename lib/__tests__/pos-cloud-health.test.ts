import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServiceClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/pos/cloud-health/route'

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))

const request = () => new NextRequest('https://example.com/api/pos/cloud-health?tenantId=tenant')
function useFetch(fetcher: typeof fetch) {
  vi.mocked(createServiceClient).mockReturnValue(createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetcher },
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as typeof globalThis & { __eccofoodPOSCloudHealth?: Map<string, unknown> }).__eccofoodPOSCloudHealth?.clear()
})
afterEach(() => vi.useRealTimers())

describe('POS cloud health route', () => {
  it('shares a slow probe across terminals and returns independently readable responses', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>(() => new Promise(resolve => setTimeout(() => resolve(Response.json({ id: 'tenant' })), 3500)))
    useFetch(fetcher)
    const first = GET(request())
    const second = GET(request())
    await vi.advanceTimersByTimeAsync(3500)
    expect(await (await first).json()).toEqual({ ok: true })
    expect(await (await second).json()).toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(await (await GET(request())).json()).toMatchObject({ ok: true, cached: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('bounds a real SDK probe, caches a failure briefly, then recovers without retry bursts', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    useFetch(fetcher)
    const first = GET(request())
    await vi.advanceTimersByTimeAsync(5000)
    expect((await first).status).toBe(504)
    expect((await GET(request())).status).toBe(504)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15001)
    fetcher.mockResolvedValueOnce(Response.json({ id: 'tenant' }))
    expect((await GET(request())).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
