import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AuthConnectionError, createSupabaseFetch, getVerifiedUser } from '../supabase/network'

const refreshUrl = 'https://project.supabase.co/auth/v1/token?grant_type=refresh_token'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Supabase session network protection', () => {
  it('does not contact Auth offline and recovers when online', async () => {
    const navigatorState = { onLine: false }
    vi.stubGlobal('navigator', navigatorState)
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    const guardedFetch = createSupabaseFetch(fetcher)

    expect((await guardedFetch(refreshUrl)).status).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
    navigatorState.onLine = true
    expect((await guardedFetch(refreshUrl)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('suppresses repeated refreshes after an outage, without blocking database writes or login', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 504 }))
      .mockImplementation(async () => new Response('{}'))
    const guardedFetch = createSupabaseFetch(fetcher)

    expect((await guardedFetch(refreshUrl)).status).toBe(503)
    for (let index = 0; index < 10; index++) {
      expect((await guardedFetch(refreshUrl)).status).toBe(503)
    }
    expect(fetcher).toHaveBeenCalledTimes(1)
    await guardedFetch('https://project.supabase.co/rest/v1/orders', { method: 'POST', body: '{}' })
    await guardedFetch('https://project.supabase.co/auth/v1/token?grant_type=password')
    expect(fetcher).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(60_001)
    expect((await guardedFetch(refreshUrl)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('aborts a stalled Auth call and suppresses subsequent network attempts', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
    const guardedFetch = createSupabaseFetch(fetcher)
    const request = guardedFetch(refreshUrl)
    await vi.advanceTimersByTimeAsync(8_000)
    expect((await request).status).toBe(503)
    expect((await guardedFetch(refreshUrl)).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('honors caller cancellation without starting an outage cooldown', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementationOnce(async (_input, init) => {
      init?.signal?.throwIfAborted()
      return new Response('{}')
    }).mockImplementation(async () => new Response('{}'))
    const guardedFetch = createSupabaseFetch(fetcher)
    await expect(guardedFetch(refreshUrl, { signal: AbortSignal.abort() })).rejects.toThrow()
    expect((await guardedFetch(refreshUrl)).status).toBe(200)
  })

  it('distinguishes unavailable Auth from invalid credentials', async () => {
    const unavailableClient = { auth: { getUser: async () => ({ data: { user: null }, error: { status: 503 } }) } }
    const invalidClient = { auth: { getUser: async () => ({ data: { user: null }, error: { status: 401 } }) } }
    await expect(getVerifiedUser(unavailableClient as unknown as SupabaseClient)).rejects.toBeInstanceOf(AuthConnectionError)
    await expect(getVerifiedUser(invalidClient as unknown as SupabaseClient)).resolves.toBeNull()
  })

  it('treats rate limiting as temporary but keeps an invalid-token response unchanged', async () => {
    const rateLimitedFetch = createSupabaseFetch(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 429 })))
    expect((await rateLimitedFetch(refreshUrl)).status).toBe(503)
    const invalidFetch = createSupabaseFetch(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 400 })))
    expect((await invalidFetch(refreshUrl)).status).toBe(400)
  })

  it('ends the page wait even while the SDK is recovering its session', async () => {
    vi.useFakeTimers()
    const client = { auth: { getUser: () => new Promise(() => {}) } }
    const result = expect(getVerifiedUser(client as unknown as SupabaseClient)).rejects.toBeInstanceOf(AuthConnectionError)
    await vi.advanceTimersByTimeAsync(10_000)
    await result
  })

  it('keeps the actual SDK refresh token during a failed refresh', async () => {
    vi.useFakeTimers()
    const storage = new Map([['network-test-session', JSON.stringify({
      access_token: 'expired-access-token', refresh_token: 'preserved-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) - 3600, token_type: 'bearer', user: { id: 'user-1' },
    })]])
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{}', { status: 503 }))
    const client = createClient('https://project.supabase.co', 'test-key', {
      global: { fetch: createSupabaseFetch(fetcher) },
      auth: {
        autoRefreshToken: false, detectSessionInUrl: false, persistSession: true,
        storageKey: 'network-test-session',
        storage: {
          getItem: (key) => storage.get(key) || null,
          setItem: (key, value) => { storage.set(key, value) },
          removeItem: (key) => { storage.delete(key) },
        },
      },
    })

    const result = client.auth.getSession()
    await vi.advanceTimersByTimeAsync(35_000)
    expect((await result).error?.name).toBe('AuthRetryableFetchError')
    expect(JSON.parse(storage.get('network-test-session')!).refresh_token).toBe('preserved-refresh-token')
    expect(fetcher).toHaveBeenCalledTimes(1)
    await client.auth.stopAutoRefresh()
  })
})
