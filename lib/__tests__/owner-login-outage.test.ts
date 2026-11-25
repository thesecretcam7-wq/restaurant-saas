import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/login/route'

const fixture = vi.hoisted(() => ({ cookies: vi.fn(), sessionError: null as any }))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: fixture.cookies }) }))
vi.mock('../rate-limit', () => ({ getAuthLimiter: () => null, getClientIp: () => 'fixture', applyRateLimit: vi.fn() }))
vi.mock('../owner-auth', () => ({ isOwnerEmail: () => false }))
vi.mock('../supabase/database', () => ({ createClient: () => ({ from: () => {
  const query: any = { upsert: () => query, retry: () => query, abortSignal: () => query,
    then: (resolve: any) => Promise.resolve({ error: fixture.sessionError }).then(resolve) }
  return query
} }) }))

let sequence = 0
const request = () => new NextRequest('https://example.com/api/auth/login', {
  method: 'POST', body: JSON.stringify({ email: 'fixture@example.com', password: 'fixture-password' }),
})
function authPayload() {
  return { access_token: 'fixture-access', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
    user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {} } }
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); fixture.sessionError = null
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://login-fixture-${++sequence}.supabase.co`)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture-key'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('owner login with the actual Supabase SSR/Auth SDK', () => {
  it('ends a stalled password request at eight seconds without setting session cookies', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
    vi.stubGlobal('fetch', fetcher)
    const pending = POST(request())
    await vi.advanceTimersByTimeAsync(8000)
    const response = await pending
    expect(response.status).toBe(503)
    expect((await response.json()).error).not.toContain('Credenciales incorrectas')
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fixture.cookies).not.toHaveBeenCalled()
  })
  it.each([429, 500, 504])('does not label a temporary Auth %s as a bad password', async status => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ message: 'Unavailable' }, { status })))
    const response = await POST(request())
    expect(response.status).toBe(503); expect(fixture.cookies).not.toHaveBeenCalled()
  })
  it('still rejects genuinely invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 })))
    expect((await POST(request())).status).toBe(401)
    expect(fixture.cookies).not.toHaveBeenCalled()
  })
  it('does not present a failed tenant lookup as a missing restaurant', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async input => String(input).includes('/auth/')
      ? Response.json(authPayload()) : Response.json({ message: 'Unavailable' }, { status: 503 })))
    expect((await POST(request())).status).toBe(503)
  })
  it.each([false, true])('keeps successful login and only sets the owner-session cookie after its write succeeds (failure=%s)', async failSession => {
    fixture.sessionError = failSession ? { message: 'Unavailable' } : null
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async input => String(input).includes('/auth/')
      ? Response.json(authPayload()) : Response.json({ id: '22222222-2222-4222-8222-222222222222', slug: 'fixture', status: 'active' })))
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).redirectUrl).toBe('/fixture/acceso')
    expect(fixture.cookies).toHaveBeenCalled()
    expect(Boolean(response.cookies.get('admin_session_token'))).toBe(!failSession)
    expect(vi.getTimerCount()).toBe(0)
  })
})
