import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthConnectionError } from '../supabase/network'
import { requireTenantAccess, tenantAuthErrorResponse } from '../tenant-api-auth'
const mocks=vi.hoisted(()=>({user:vi.fn(),cookie:null as string|null,query:vi.fn()}))
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>mocks.cookie?{value:mocks.cookie}:undefined})}))
vi.mock('../supabase/network',async original=>({...await original<typeof import('../supabase/network')>(),getVerifiedUser:mocks.user}))
vi.mock('../supabase/server',()=>({createClient:async()=>({}),createServiceClient:()=>({from:()=>({select(){return this},eq(){return this},maybeSingle:mocks.query})})}))
beforeEach(()=>{vi.clearAllMocks();mocks.cookie=null;mocks.user.mockResolvedValue({id:'owner'});mocks.query.mockResolvedValue({data:{id:'tenant',owner_id:'owner'},error:null})})
describe('tenant access during an outage',()=>{
 it('keeps a valid staff PIN session independent of owner Auth',async()=>{
  mocks.cookie=JSON.stringify({tenantId:'tenant',staffId:'cashier',role:'cajero'})
  expect(await requireTenantAccess('tenant')).toMatchObject({type:'staff',staffId:'cashier'})
  expect(mocks.user).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled()
 })
 it('reports unavailable Auth as 503 instead of invalid credentials',async()=>{
  mocks.user.mockRejectedValue(new AuthConnectionError())
  const error=await requireTenantAccess('tenant').catch(error=>error),response=tenantAuthErrorResponse(error)
  expect(response.status).toBe(503);expect((await response.json()).error).toContain('El servicio no responde')
 })
 it('reports a failed ownership lookup as 503, without permitting access',async()=>{
  mocks.query.mockResolvedValue({data:null,error:{message:'Down'}})
  await expect(requireTenantAccess('tenant')).rejects.toMatchObject({status:503})
 })
 it('still rejects a genuinely invalid owner and wrong ownership',async()=>{
  mocks.user.mockResolvedValueOnce(null);await expect(requireTenantAccess('tenant')).rejects.toMatchObject({status:401})
  mocks.query.mockResolvedValueOnce({data:{owner_id:'another-owner'},error:null});await expect(requireTenantAccess('tenant')).rejects.toMatchObject({status:403})
 })
})
