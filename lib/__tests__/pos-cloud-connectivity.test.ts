import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPOSCloudProbe, fetchPOSBootstrapWithTimeout } from '../pos-cloud-connectivity'

afterEach(() => vi.useRealTimers())

describe('POS cloud connectivity', () => {
  it('cancels bootstrap requests that time out instead of leaving them running', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const request = fetchPOSBootstrapWithTimeout('tenant', fetcher)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await request).toBeNull()
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
  })

  it('recovers even if a probe throws synchronously', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => { throw new Error('Network unavailable') })
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const check = createPOSCloudProbe(fetcher, () => true)
    expect(await check('tenant')).toBe(false)
    expect(await check('tenant')).toBe(true)
  })
  it('accepts a slow healthy response and shares simultaneous checks', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>(() => new Promise(resolve => {
      setTimeout(() => resolve(Response.json({ ok: true })), 4000)
    }))
    const check = createPOSCloudProbe(fetcher, () => true)
    const first = check('tenant')
    const second = check('tenant')
    expect(first).toBe(second)
    await vi.advanceTimersByTimeAsync(4000)
    expect(await first).toBe(true)
    expect(await check('tenant')).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5001)
    const next = check('tenant')
    await vi.advanceTimersByTimeAsync(4000)
    expect(await next).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('recovers after failure without reloading or losing local state', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ ok: false }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ ok: true }))
    const check = createPOSCloudProbe(fetcher, () => true)
    expect(await check('tenant')).toBe(false)
    expect(await check('tenant')).toBe(true)
  })

  it('does not send probes while the browser is offline, even after a success', async () => {
    let online = true
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true }))
    const check = createPOSCloudProbe(fetcher, () => online)
    expect(await check('tenant')).toBe(true)
    online = false
    expect(await check('tenant')).toBe(false)
    expect(await check('')).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('aborts timed out probes and allows a later recovery attempt', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const check = createPOSCloudProbe(fetcher, () => true)
    const first = check('tenant')
    await vi.advanceTimersByTimeAsync(8000)
    expect(await first).toBe(false)
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
    fetcher.mockResolvedValueOnce(Response.json({ ok: true }))
    expect(await check('tenant')).toBe(true)
  })

  it.each([
    () => Response.json({ ok: false }),
    () => new Response('<html>Login</html>'),
    () => Response.json({ offline: true }),
  ])('does not confuse a cached offline page or login with a healthy cloud', async response => {
    expect(await createPOSCloudProbe(vi.fn<typeof fetch>().mockResolvedValue(response()), () => true)('tenant')).toBe(false)
  })
})
