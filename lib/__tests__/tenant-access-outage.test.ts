import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthConnectionError } from '../supabase/network'
import { requireTenantAccess, tenantAuthErrorResponse } from '../tenant-api-auth'
import { signServerValue } from '../server-signed-token'

const tenantId = '11111111-1111-4111-8111-111111111111'
const staffId = '22222222-2222-4222-8222-222222222222'
const mocks = vi.hoisted(() => ({ user: vi.fn(), cookies: new Map<string,string>(), query: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({
  get: (key:string) => mocks.cookies.has(key) ? { value:mocks.cookies.get(key) } : undefined,
}) }))
vi.mock('../supabase/network', async original => ({
  ...await original<typeof import('../supabase/network')>(), getVerifiedUser:mocks.user,
}))
vi.mock('../supabase/server', () => ({
  createClient:async () => ({}),
  createServiceClient:() => ({ from:() => ({
    select(){return this}, eq(){return this}, retry(){return this}, abortSignal(){return this}, maybeSingle:mocks.query,
  }) }),
}))
function session(role = 'cajero', permissions:string[] = [], signed = true) {
  const raw = JSON.stringify({
    tenantId, staffId, role, permissions,
    sessionToken:'33333333-3333-4333-8333-333333333333', createdAt:new Date().toISOString(),
  })
  mocks.cookies.set('staff_session', raw)
  if (signed) mocks.cookies.set('staff_session_signature', signServerValue('staff-session-v1', raw))
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CSRF_SECRET', 'tenant-auth-test-secret')
  mocks.cookies.clear()
  mocks.user.mockResolvedValue({id:'owner'})
  mocks.query.mockResolvedValue({data:{id:tenantId, owner_id:'owner'}, error:null})
})
afterEach(() => vi.unstubAllEnvs())

describe('tenant access during an outage', () => {
  it('keeps a signed staff PIN session independent of owner Auth and database reads', async () => {
    session()
    expect(await requireTenantAccess(tenantId)).toMatchObject({type:'staff',staffId})
    expect(mocks.user).not.toHaveBeenCalled()
    expect(mocks.query).not.toHaveBeenCalled()
  })
  it('reports unavailable Auth as 503 instead of invalid credentials', async () => {
    mocks.user.mockRejectedValue(new AuthConnectionError())
    const error = await requireTenantAccess(tenantId).catch(error => error)
    const response = tenantAuthErrorResponse(error)
    expect(response.status).toBe(503)
    expect((await response.json()).error).toContain('El servicio no responde')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('reports a failed ownership lookup as 503, without permitting access', async () => {
    mocks.query.mockResolvedValue({data:null,error:{message:'Down'}})
    await expect(requireTenantAccess(tenantId)).rejects.toMatchObject({status:503})
  })
  it('still rejects a genuinely invalid owner and wrong ownership', async () => {
    mocks.user.mockResolvedValueOnce(null)
    await expect(requireTenantAccess(tenantId)).rejects.toMatchObject({status:401})
    mocks.query.mockResolvedValueOnce({data:{owner_id:'another-owner'},error:null})
    await expect(requireTenantAccess(tenantId)).rejects.toMatchObject({status:403})
  })
  it('does not accept a forged cookie as owner or grant its claimed permissions', async () => {
    session('admin', ['admin_dashboard'])
    mocks.cookies.set('staff_session_signature','forged')
    mocks.user.mockResolvedValue(null)
    await expect(requireTenantAccess(tenantId)).rejects.toMatchObject({status:401})
    expect(mocks.query).not.toHaveBeenCalled()
  })
  it('requires independent ownership for a different tenant or owner-only action', async () => {
    session()
    mocks.user.mockResolvedValue(null)
    await expect(requireTenantAccess('44444444-4444-4444-8444-444444444444')).rejects.toMatchObject({status:401})
    await expect(requireTenantAccess(tenantId,{staffRoles:[]})).rejects.toMatchObject({status:401})
  })
  it('retains role restrictions while allowing explicit signed admin permissions', async () => {
    session('cocinero')
    mocks.user.mockResolvedValue(null)
    await expect(requireTenantAccess(tenantId,{staffRoles:['cajero']})).rejects.toMatchObject({status:401})
    session('manager',['admin_dashboard'])
    expect(await requireTenantAccess(tenantId,{staffRoles:['cajero'],requireAdminPermission:true})).toMatchObject({type:'staff',role:'manager'})
  })
  it('can use an independently verified owner even when a staff cookie is invalid', async () => {
    mocks.cookies.set('staff_session','malformed')
    expect(await requireTenantAccess(tenantId)).toEqual({type:'owner',userId:'owner'})
  })
})
