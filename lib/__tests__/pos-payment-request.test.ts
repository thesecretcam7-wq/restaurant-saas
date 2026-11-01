import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPOSPayment, fetchPOSSecurityToken, POSPaymentConfirmationError } from '../pos-payment-request'

afterEach(() => vi.useRealTimers())

describe('POS payment confirmation', () => {
  it('preserves confirmed results and validation responses without retrying', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ orderId: 'order-1' }))
      .mockResolvedValueOnce(Response.json({ error: 'Invalid items' }, { status: 400 }))
    expect(await (await fetchPOSPayment('/api/orders', { method: 'POST' }, fetcher)).json()).toEqual({ orderId: 'order-1' })
    const invalid = await fetchPOSPayment('/api/orders', { method: 'POST' }, fetcher)
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({ error: 'Invalid items' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('aborts a stalled write, reports an unconfirmed payment and never retries it', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = fetchPOSPayment('/api/orders/table-1', { method: 'PATCH' }, fetcher).catch(error => error)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await result).toBeInstanceOf(POSPaymentConfirmationError)
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('also bounds a response whose headers arrive but whose body stalls', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
      const stream = new ReadableStream({ start(controller) {
        options?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')))
      } })
      return new Response(stream)
    })
    const result = fetchPOSPayment('/api/orders', { method: 'POST' }, fetcher).catch(error => error)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await result).toBeInstanceOf(POSPaymentConfirmationError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does not turn a lost response into proof that an order was rejected', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(fetchPOSPayment('/api/orders', { method: 'POST' }, fetcher)).rejects.toBeInstanceOf(POSPaymentConfirmationError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('POS security preparation', () => {
  it('bounds a stalled token request before any payment is sent', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = fetchPOSSecurityToken(fetcher).catch(error => error)
    await vi.advanceTimersByTimeAsync(8_000)
    expect((await result).message).toContain('No se envió el cobro')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('returns a valid token and rejects malformed or unavailable responses', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: 'test-token' }))
      .mockResolvedValueOnce(Response.json({ error: 'Unavailable' }, { status: 503 }))
    expect(await fetchPOSSecurityToken(fetcher)).toBe('test-token')
    await expect(fetchPOSSecurityToken(fetcher)).rejects.toThrow('No se envió el cobro')
  })
})
