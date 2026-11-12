import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSignedStaffSession, getVerifiedStaffSession } from '../staff-session'
import { signServerValue } from '../server-signed-token'
import { GET } from '@/app/api/staff/session/route'

const tenantId = '11111111-1111-4111-8111-111111111111'
const staffId = '22222222-2222-4222-8222-222222222222'
const token = '33333333-3333-4333-8333-333333333333'
const m = vi.hoisted(() => ({
  cookies: new Map<string,string>(), set: vi.fn(), clear: vi.fn(), from: vi.fn(),
  errors: {} as Record<string,unknown>, activeToken: '', role: 'cajero', gate: null as Promise<void> | null,
}))
const reader = { get: (key:string) => m.cookies.has(key) ? {value:m.cookies.get(key)!} : undefined, set:m.set, delete:m.clear }
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (key:string) => m.cookies.has(key) ? {value:m.cookies.get(key)!} : undefined, set:m.set, delete:m.clear,
}) }))
vi.mock('../supabase/server', () => ({ createServiceClient: () => ({from:m.from}) }))
function session(extra = {}, signed = true, encoded = false) {
  const raw = JSON.stringify({tenantId,staffId,staffName:'Untrusted name',role:'cajero',permissions:['admin_fake'],sessionToken:token,createdAt:new Date().toISOString(),...extra})
  m.cookies.set('staff_session', encoded ? encodeURIComponent(raw) : raw)
  if (signed) m.cookies.set('staff_session_signature', signServerValue('staff-session-v1',raw))
  return raw
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('CSRF_SECRET','staff-session-test-secret')
  m.cookies.clear(); m.errors={}; m.activeToken=token; m.role='cajero'; m.gate=null
  m.from.mockImplementation((table:string) => {
    const q:any = new Proxy({}, { get(_target,key) {
      if (key === 'then') return async (resolve:any,reject:any) => {
        try {
          await m.gate
          resolve({data:table==='active_sessions'?{session_token:m.activeToken}:table==='staff_members'?{id:staffId,name:'Server name',role:m.role,is_active:true}:[{admin_permissions:{key:'admin_dashboard'}}],error:m.errors[table] || null})
        } catch(error) { reject(error) }
      }
      return () => q
    } })
    return q
  })
})
afterEach(() => vi.unstubAllEnvs())

describe('shared staff session verification', () => {
  it.each(['admin','cajero','camarero','cocinero'])('verifies a signed %s without database reads', async role => {
    session({role})
    expect(await getVerifiedStaffSession(reader)).toMatchObject({tenantId,staffId,role})
    expect(m.from).not.toHaveBeenCalled()
  })
  it('accepts the same signed JSON after cookie URL decoding', async () => {
    session({},true,true)
    expect(await getVerifiedStaffSession(reader)).toMatchObject({staffId})
  })
  it.each([
    {createdAt:'invalid'}, {createdAt:new Date(Date.now()+120000).toISOString()},
    {createdAt:'2000-01-01T00:00:00Z'}, {role:'admin',createdAt:new Date(Date.now()-9*3600000).toISOString()},
    {staffId:'invalid'}, {permissions:[42]},
  ])('rejects malformed or expired signed claims: %j', async claims => {
    session(claims)
    await expect(getVerifiedStaffSession(reader)).rejects.toMatchObject({status:401})
    expect(m.from).not.toHaveBeenCalled()
  })
  it('rejects tampering and never falls back to trusting unsigned permissions', async () => {
    session(); m.cookies.set('staff_session',m.cookies.get('staff_session')!.replace('cajero','admin'))
    await expect(getVerifiedStaffSession(reader)).rejects.toMatchObject({status:401})
    expect(m.from).not.toHaveBeenCalled()
  })
  it('does not query for another tenant or for unsigned public routing preferences', async () => {
    session({},false)
    expect(getSignedStaffSession(reader)).toBeNull()
    expect(await getVerifiedStaffSession(reader,{tenantId:'another'})).toBeNull()
    expect(m.from).not.toHaveBeenCalled()
  })
  it('shares concurrent legacy checks, then rechecks subsequent unsigned requests', async () => {
    session({},false)
    let release!: () => void
    m.gate=new Promise<void>(done => {release=done})
    const first=getVerifiedStaffSession(reader),second=getVerifiedStaffSession(reader)
    expect(m.from).toHaveBeenCalledTimes(2)
    release()
    const values=await Promise.all([first,second])
    expect(values[0]).toMatchObject({staffName:'Server name',permissions:['admin_dashboard']})
    expect(values[1]).toEqual(values[0]); expect(m.from).toHaveBeenCalledTimes(3)
    await getVerifiedStaffSession(reader)
    expect(m.from).toHaveBeenCalledTimes(6)
  })
  it('never upgrades or clears a cookie on a database failure, and permits a later retry', async () => {
    session({},false); m.errors.active_sessions={message:'Unavailable'}
    const response=await GET()
    expect(response.status).toBe(503); expect(m.set).not.toHaveBeenCalled(); expect(m.clear).not.toHaveBeenCalled()
    m.errors={}
    expect((await GET()).status).toBe(200)
    expect(m.set).toHaveBeenCalledWith('staff_session',expect.any(String),expect.objectContaining({httpOnly:true,maxAge:expect.any(Number)}))
  })
  it('does not authenticate a legacy role or server token mismatch', async () => {
    session({role:'admin'},false)
    await expect(getVerifiedStaffSession(reader)).rejects.toMatchObject({status:401})
    session({},false); m.activeToken='different'
    await expect(getVerifiedStaffSession(reader)).rejects.toMatchObject({status:401})
  })
  it('returns a private signed profile without exposing session credentials', async () => {
    session()
    const response=await GET(),body=await response.json()
    expect(response.status).toBe(200); expect(body).toMatchObject({authenticated:true,tenantId,staffId})
    expect(body.sessionToken).toBeUndefined(); expect(body.signature).toBeUndefined()
    expect(response.headers.get('cache-control')).toContain('no-store'); expect(m.from).not.toHaveBeenCalled()
  })
  it('rejects a forged profile and does not clear saved cookies', async () => {
    session();m.cookies.set('staff_session_signature','forged')
    expect((await GET()).status).toBe(401);expect(m.clear).not.toHaveBeenCalled()
  })
})
