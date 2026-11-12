import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { signServerValue } from '../server-signed-token'

const mocks = vi.hoisted(() => ({
  verifiedUser: vi.fn(), serverClient: vi.fn(), from: vi.fn(), fetch: vi.fn(),
  ownership: { data: { id: '11111111-1111-4111-8111-111111111111' }, error: null } as { data: { id: string } | null; error: unknown },
  active: { data: { session_token: '33333333-3333-4333-8333-333333333333' }, error: null } as { data: { session_token: string } | null; error: unknown },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.serverClient }))
vi.mock('@/lib/supabase/network', async importOriginal => ({
  ...await importOriginal<typeof import('../supabase/network')>(), getVerifiedUser: mocks.verifiedUser,
}))

let proxy: typeof import('../../proxy').proxy
const request = (staff = false, path = '/cafe/admin/dashboard') => {
  const raw = JSON.stringify({
    tenantId: '11111111-1111-4111-8111-111111111111', staffId: '22222222-2222-4222-8222-222222222222',
    role: 'admin', permissions: ['admin_dashboard'], sessionToken: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date().toISOString(),
  })
  return new NextRequest(`https://www.eccofoodapp.com${path}`, {
    headers: {
      host: 'www.eccofoodapp.com',
      cookie: staff
        ? `staff_session=${encodeURIComponent(raw)}; staff_session_signature=${signServerValue('staff-session-v1', raw)}`
        : 'sb-project-auth-token=existing-owner-session',
    },
  })
}

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('CSRF_SECRET', 'navigation-test-secret')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service')
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
  vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'eccofoodapp.com')
  mocks.ownership = { data: { id: '11111111-1111-4111-8111-111111111111' }, error: null }
  mocks.active = { data: { session_token: '33333333-3333-4333-8333-333333333333' }, error: null }
  mocks.verifiedUser.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com' })
  mocks.serverClient.mockImplementation((_url, _key, options) => ({ options }))
  mocks.fetch.mockImplementation(async () => Response.json([{ id: '11111111-1111-4111-8111-111111111111', slug: 'cafe' }]))
  vi.stubGlobal('fetch', mocks.fetch)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  mocks.from.mockImplementation((table: string) => {
    const result = table === 'active_sessions' ? mocks.active : mocks.ownership
    return {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
      retry: vi.fn().mockReturnThis(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
  })
  proxy = (await import('../../proxy')).proxy
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('admin navigation session protection', () => {
  it('rejects forged staff JSON for operational and admin routes', async () => {
    mocks.verifiedUser.mockResolvedValue(null)
    for (const path of ['/cafe/staff/pos','/cafe/admin/dashboard']) {
      const forged = request(true,path)
      forged.cookies.set('staff_session_signature','forged')
      const response = await proxy(forged)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toMatch(/\/acceso\/login\/|\/admin\/login/)
      expect(response.cookies.get('staff_session')).toBeUndefined()
    }
  })

  it('admits a signed cashier to the TPV without owner Auth or active-session polling', async () => {
    const req = request(true,'/cafe/staff/pos')
    const raw = JSON.stringify({...JSON.parse(req.cookies.get('staff_session')!.value),role:'cajero'})
    req.cookies.set('staff_session',raw)
    req.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
    expect((await proxy(req)).status).toBe(200)
    expect(mocks.verifiedUser).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('allows valid owner navigation between menu entries', async () => {
    for (const section of ['dashboard', 'compras', 'finanzas', 'ai-insights']) {
      const response = await proxy(request(false, `/cafe/admin/${section}`))
      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    }
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it('does not treat a failed tenant lookup as logout or cache it as a missing restaurant', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('', { status: 504 }))
    const response = await proxy(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('set-cookie')).toBeNull()
    expect((await proxy(request())).status).toBe(200)
    expect(mocks.fetch).toHaveBeenCalledTimes(2)
  })

  it('bounds a stalled tenant lookup without redirecting to login', async () => {
    vi.useFakeTimers()
    mocks.fetch.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('Request timed out')))
    }))
    const pending = proxy(request())
    await vi.advanceTimersByTimeAsync(8001)
    const response = await pending
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
  })

  it('coalesces concurrent tenant lookups', async () => {
    let resolve!: (value: Response) => void
    mocks.fetch.mockImplementationOnce(() => new Promise<Response>(done => { resolve = done }))
    const first = proxy(request())
    const second = proxy(request(false, '/cafe/admin/compras'))
    resolve(Response.json([{ id: '11111111-1111-4111-8111-111111111111', slug: 'cafe' }]))
    expect((await Promise.all([first, second])).map(response => response.status)).toEqual([200, 200])
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it('accepts a slow but successful first tenant lookup without failing all concurrent pages',async()=>{
    vi.useFakeTimers()
    mocks.fetch.mockImplementationOnce((_url,init)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>resolve(Response.json([{id:'11111111-1111-4111-8111-111111111111',slug:'cafe'}])),4500)
      init.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('Request timed out'))})
    }))
    const pending=Promise.all(['dashboard','compras','finanzas'].map(section=>proxy(request(false,`/cafe/admin/${section}`))))
    await vi.advanceTimersByTimeAsync(4501)
    expect((await pending).map(r=>r.status)).toEqual([200,200,200])
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })

  it('preserves staff cookies when active-session verification fails', async () => {
    mocks.active = { data: null, error: { code: '57014', message: 'timeout' } }
    const response = await proxy(request(true))
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.cookies.get('staff_session')).toBeUndefined()
  })

  it('allows a verified staff administrator without requiring an owner session', async () => {
    const response = await proxy(request(true))
    expect(response.status).toBe(200)
    expect(mocks.verifiedUser).not.toHaveBeenCalled()
  })

  it('does not redirect or clear cookies when Auth is temporarily unavailable', async () => {
    mocks.verifiedUser.mockRejectedValueOnce(Object.assign(new Error('Auth unavailable'), { status: 503 }))
    const response = await proxy(request())
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('still rejects a staff token that was actually replaced by another login', async () => {
    mocks.active = { data: { session_token: 'new-token' }, error: null }
    const response = await proxy(request(true))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('reason=otra_sesion')
    expect(response.cookies.get('staff_session')?.value).toBe('')
  })

  it('still rejects a genuinely missing staff session', async () => {
    mocks.active = { data: null, error: null }
    expect((await proxy(request(true))).headers.get('location')).toContain('reason=otra_sesion')
  })

  it('preserves refreshed cookies and anti-cache headers on successful navigation', async () => {
    mocks.verifiedUser.mockImplementationOnce(async client => {
      client.options.cookies.setAll([{ name: 'sb-project-auth-token', value: 'refreshed', options: { path: '/' } }], {
        'Cache-Control': 'private, no-store', Expires: '0', Pragma: 'no-cache',
      })
      return { id: 'owner-1', email: 'owner@example.com' }
    })
    const response = await proxy(request())
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('refreshed')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('pragma')).toBe('no-cache')
  })

  it('does not discard a refreshed token when the ownership database query fails afterwards', async () => {
    mocks.ownership = { data: null, error: { message: 'connection unavailable' } }
    mocks.verifiedUser.mockImplementationOnce(async client => {
      client.options.cookies.setAll([{ name: 'sb-project-auth-token', value: 'refreshed', options: { path: '/' } }], {})
      return { id: 'owner-1', email: 'owner@example.com' }
    })
    const response = await proxy(request())
    expect(response.status).toBe(503)
    expect(response.cookies.get('sb-project-auth-token')?.value).toBe('refreshed')
    expect(response.headers.get('location')).toBeNull()
  })

  it('does not grant access when there is no verified owner or ownership belongs to somebody else', async () => {
    mocks.verifiedUser.mockResolvedValueOnce(null)
    expect((await proxy(request())).headers.get('location')).toContain('/cafe/admin/login')
    mocks.ownership = { data: null, error: null }
    expect((await proxy(request())).headers.get('location')).toContain('/cafe/admin/login')
  })
})
