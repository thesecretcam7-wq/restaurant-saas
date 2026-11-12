import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/logout/route'
import { signServerValue } from '../server-signed-token'

const m=vi.hoisted(() => ({cookies:new Map<string,string>(),from:vi.fn(),filters:[] as unknown[][],fail:false}))
vi.mock('next/headers', () => ({cookies:async () => ({
  get:(key:string) => m.cookies.has(key)?{value:m.cookies.get(key)!}:undefined,
  getAll:() => [],set:vi.fn(),
})}))
vi.mock('@supabase/ssr', () => ({createServerClient:() => ({auth:{getUser:async () => ({data:{user:null}}),signOut:async () => ({error:null})}})}))
vi.mock('../supabase/database', () => ({createClient:() => ({from:m.from})}))
beforeEach(() => {
  vi.clearAllMocks();vi.stubEnv('CSRF_SECRET','logout-test-secret')
  m.cookies.clear();m.filters=[];m.fail=false
  m.from.mockImplementation(() => {
    const q:any={delete:() => q,eq:(...args:unknown[]) => {m.filters.push(args);return q},retry:() => q,abortSignal:() => q,
      then:(resolve:any,reject:any) => m.fail?Promise.reject(Error('Unavailable')).then(resolve,reject):Promise.resolve({error:null}).then(resolve,reject)}
    return q
  })
})
afterEach(() => vi.unstubAllEnvs())
function session() {
  const data={tenantId:'11111111-1111-4111-8111-111111111111',staffId:'22222222-2222-4222-8222-222222222222',role:'cajero',permissions:[],sessionToken:'33333333-3333-4333-8333-333333333333',createdAt:new Date().toISOString()}
  const raw=JSON.stringify(data)
  m.cookies.set('staff_session',raw);m.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
  return data
}
const request=() => new Request('https://www.eccofoodapp.com/api/auth/logout?next=/cafe/acceso',{method:'POST'})
describe('verified staff logout', () => {
  it('revokes only the exact employee, tenant and token, then clears both cookies', async () => {
    const data=session(),response=await POST(request())
    expect(m.from).toHaveBeenCalledWith('active_sessions')
    expect(m.filters).toEqual([['user_key','staff:'+data.staffId],['tenant_id',data.tenantId],['session_token',data.sessionToken]])
    expect(response.status).toBe(303);expect(response.headers.get('location')).toBe('https://www.eccofoodapp.com/cafe/acceso')
    expect(response.cookies.get('staff_session')?.value).toBe('');expect(response.cookies.get('staff_session_signature')?.value).toBe('')
  })
  it('cannot revoke an employee session using a forged cookie', async () => {
    session();m.cookies.set('staff_session_signature','forged')
    expect((await POST(request())).status).toBe(303);expect(m.from).not.toHaveBeenCalled()
  })
  it('still completes an explicit local logout when database revocation is unavailable', async () => {
    session();m.fail=true
    const response=await POST(request())
    expect(response.status).toBe(303);expect(response.cookies.get('staff_session')?.value).toBe('')
  })
})
