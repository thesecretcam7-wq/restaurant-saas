import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canCreateOrder } from '../checkPlan'
const mocks=vi.hoisted(()=>({tables:vi.fn(),plan:'premium',error:null as unknown,countError:null as unknown,count:0}))
vi.mock('../supabase/database',()=>({createClient:()=>({from:(table:string)=>{
 mocks.tables(table)
 const q:any=new Proxy({},{get(_,key){if(key==='then')return (resolve:(v:unknown)=>unknown)=>Promise.resolve(resolve(table==='tenants'?{data:{subscription_plan:mocks.plan,status:'active',created_at:'2026-01-01T00:00:00Z',subscription_expires_at:'2030-01-01T00:00:00Z'},error:mocks.error}:{count:mocks.count,error:mocks.countError}));return()=>q}})
 return q
}})}))
beforeEach(()=>{vi.clearAllMocks();mocks.plan='premium';mocks.error=null;mocks.countError=null;mocks.count=0})
describe('plan checks under load',()=>{
 it('avoids exact monthly order counts for unlimited plans',async()=>{
  expect(await canCreateOrder('tenant')).toMatchObject({allowed:true,limit:Infinity})
  expect(mocks.tables).not.toHaveBeenCalledWith('orders')
 })
 it('does not misreport an outage as an expired subscription',async()=>{
  mocks.error={message:'Database unavailable'}
  await expect(canCreateOrder('tenant')).rejects.toEqual(mocks.error)
 })
 it('still enforces limited plans and does not assume zero after a failed count',async()=>{
  mocks.plan='basic';mocks.count=100000
  expect((await canCreateOrder('tenant')).allowed).toBe(false)
  mocks.countError={message:'Count failed'}
  await expect(canCreateOrder('tenant')).rejects.toEqual(mocks.countError)
 })
})
