import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAdminAccess } from '../admin-access'
import { AuthConnectionError } from '../supabase/network'
import { signServerValue } from '../server-signed-token'

const tenantId='11111111-1111-4111-8111-111111111111'
const m=vi.hoisted(() => ({
  user:vi.fn(), client:vi.fn(), service:vi.fn(), filters:[] as unknown[][],
  cookies:new Map<string,string>(), error:null as unknown, row:null as any,
}))
vi.mock('../supabase/server', () => ({createClient:m.client,createServiceClient:m.service}))
vi.mock('../supabase/network', async original => ({
  ...await original<typeof import('../supabase/network')>(),getVerifiedUser:m.user,
}))
const reader={
  get:(key:string) => m.cookies.has(key)?{value:m.cookies.get(key)!}:undefined,
  getAll:() => [...m.cookies].map(([name,value]) => ({name,value})),
}
function staff(tenant=tenantId,role='admin',permissions=['admin_dashboard']) {
  const raw=JSON.stringify({tenantId:tenant,staffId:'22222222-2222-4222-8222-222222222222',staffName:'Fixture',role,permissions,sessionToken:'33333333-3333-4333-8333-333333333333',createdAt:new Date().toISOString()})
  m.cookies.set('staff_session',raw)
  m.cookies.set('staff_session_signature',signServerValue('staff-session-v1',raw))
}
beforeEach(() => {
  vi.clearAllMocks();vi.stubEnv('CSRF_SECRET','admin-access-test-secret')
  m.cookies.clear();m.filters=[];m.error=null
  m.row={id:tenantId,slug:'cafe',organization_name:'Fixture',owner_id:'owner'}
  const client={from:() => {
    const filters:unknown[][]=[]
    const q:any={select:() => q,retry:() => q,abortSignal:() => q,
      eq:(...args:unknown[]) => {filters.push(args);m.filters.push(args);return q},
      maybeSingle:async () => ({data:m.row&&filters.every(([key,value]) => m.row[key as string]===value)?m.row:null,error:m.error}),
    }
    return q
  }}
  m.client.mockResolvedValue(client);m.service.mockReturnValue(client);m.user.mockResolvedValue(null)
})
afterEach(() => vi.unstubAllEnvs())

describe('admin server access', () => {
  it('loads staff tenant by both requested slug and verified tenant, without owner Auth', async () => {
    staff()
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:m.row,isStaffAdmin:true,isOwner:false})
    expect(m.filters).toContainEqual(['slug','cafe']);expect(m.filters).toContainEqual(['id',tenantId])
    expect(m.client).not.toHaveBeenCalled();expect(m.user).not.toHaveBeenCalled()
  })
  it.each(['sb-project-auth-token','sb-project-auth-token.0'])('keeps verified staff access when optional owner Auth fails (%s)', async name => {
    staff();m.cookies.set(name,'fixture');m.user.mockRejectedValue(new AuthConnectionError())
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({isStaffAdmin:true,isOwner:false})
    expect(m.user).toHaveBeenCalledOnce()
  })
  it('fails with 503 rather than treating an owner outage as invalid credentials', async () => {
    m.user.mockRejectedValue(new AuthConnectionError())
    await expect(resolveAdminAccess('cafe',reader)).rejects.toMatchObject({status:503})
  })
  it('preserves 503 on a failed tenant lookup', async () => {
    staff();m.error={message:'Database unavailable'}
    await expect(resolveAdminAccess('cafe',reader)).rejects.toMatchObject({status:503})
  })
  it('does not authorize another restaurant through a valid staff signature', async () => {
    staff('44444444-4444-4444-8444-444444444444')
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:null,isStaffAdmin:false,isOwner:false})
  })
  it('does not load staff tenant through a non-admin role', async () => {
    staff(tenantId,'cocinero',[])
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:null,isStaffAdmin:false})
    expect(m.service).not.toHaveBeenCalled()
  })
  it('requires independently verified ownership even with forged staff JSON', async () => {
    staff();m.cookies.set('staff_session_signature','forged')
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:null,isStaffAdmin:false})
    m.user.mockResolvedValue({id:'owner'})
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:m.row,isOwner:true,isStaffAdmin:false})
    expect(m.filters).toContainEqual(['owner_id','owner'])
  })
  it('cannot use an unrelated owner session to read another restaurant', async () => {
    m.user.mockResolvedValue({id:'other-owner'})
    expect(await resolveAdminAccess('cafe',reader)).toMatchObject({tenant:null,isOwner:false})
    expect(m.filters).toContainEqual(['owner_id','other-owner'])
  })
  it('resolves UUID routes with the same tenant scope', async () => {
    staff()
    expect(await resolveAdminAccess(tenantId,reader)).toMatchObject({isStaffAdmin:true})
    expect(m.filters.filter(([key]) => key==='id')).toEqual([['id',tenantId],['id',tenantId]])
  })
})
