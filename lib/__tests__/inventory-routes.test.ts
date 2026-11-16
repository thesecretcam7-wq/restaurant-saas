import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/inventory/[id]/stock-movement/route'
import { POST as create } from '@/app/api/inventory/route'
import { TenantAuthError } from '../tenant-auth-error'
const tenantId='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',requestId='33333333-3333-4333-8333-333333333333'
const m=vi.hoisted(()=>({access:vi.fn(),rpc:vi.fn(),result:{data:null,error:null} as any,from:vi.fn(),filters:[] as unknown[][]}))
vi.mock('../tenant-api-auth',async original=>({...await original<typeof import('../tenant-api-auth')>(),requireTenantAccess:m.access}))
vi.mock('../supabase/server',()=>({createServiceClient:()=>({rpc:m.rpc,from:m.from})}))
const req=(body:any)=>new NextRequest('https://example.com/api/inventory/'+id+'/stock-movement',{method:'POST',body:JSON.stringify(body)})
const params={params:Promise.resolve({id})}
beforeEach(()=>{
 vi.clearAllMocks();m.filters=[];m.access.mockResolvedValue({type:'staff',staffId:'verified-staff'})
 m.result={data:{updated:{id,current_stock:0}},error:null}
 m.rpc.mockImplementation(()=>{const q:any={retry:()=>q,abortSignal:()=>q,then:(resolve:any)=>Promise.resolve(m.result).then(resolve)};return q})
})
afterEach(()=>vi.restoreAllMocks())
describe('inventory mutation boundary',()=>{
 it('accepts a zero recount, preserves the expected stock and uses the verified actor',async()=>{
  expect((await POST(req({tenantId,requestId,movementType:'adjustment',quantity:0,expectedStock:8,createdBy:'forged'}),params)).status).toBe(200)
  expect(m.rpc).toHaveBeenCalledWith('record_inventory_movement',expect.objectContaining({p_quantity:0,p_expected_stock:8,p_created_by:'verified-staff',p_tenant_id:tenantId,p_inventory_id:id,p_request_id:requestId}))
 })
 it.each([{movementType:'invalid',quantity:1},{movementType:'purchase',quantity:-1},{movementType:'purchase',quantity:0},{movementType:'adjustment',quantity:2},{movementType:'damage',quantity:0.0001}])('rejects an invalid command before writing: %j',async body=>{
  expect((await POST(req({tenantId,requestId,...body}),params)).status).toBe(400);expect(m.rpc).not.toHaveBeenCalled()
 })
 it('returns a conflict on a stale recount instead of overwriting newer stock',async()=>{
  m.result={data:null,error:{code:'P0001',message:'STOCK_CHANGED'}}
  expect((await POST(req({tenantId,requestId,movementType:'adjustment',quantity:0,expectedStock:8}),params)).status).toBe(409)
 })
 it('preserves temporary access errors and never writes without authorization',async()=>{
  m.access.mockRejectedValue(new TenantAuthError('Unauthorized',503))
  expect((await POST(req({tenantId,requestId,movementType:'purchase',quantity:1}),params)).status).toBe(503)
  expect(m.rpc).not.toHaveBeenCalled()
 })
 it('creates fractional initial stock in one call without trusting actor data',async()=>{
  m.result={data:{id,current_stock:1.5},error:null}
  const response=await create(req({tenantId,requestId,productName:'Harina',unit:'kg',initialStock:'1,5',minStock:0,maxStock:0,costPerUnit:0,createdBy:'forged'}))
  expect(response.status).toBe(201)
  expect(m.rpc).toHaveBeenCalledWith('create_inventory_item',expect.objectContaining({p_tenant_id:tenantId,p_item_id:requestId,p_values:expect.objectContaining({current_stock:1.5,min_stock:0}),p_created_by:'verified-staff'}))
 })
 it('loads only a bounded, tenant-scoped page of movements and ignores non-order references',async()=>{
  m.from.mockImplementation(()=>{const q:any={select:()=>q,eq:(...args:unknown[])=>{m.filters.push(args);return q},order:()=>q,range:(...args:unknown[])=>{m.filters.push(['range',...args]);return q},retry:()=>q,abortSignal:()=>q,then:(resolve:any)=>Promise.resolve({data:[{id:'movement',reference_id:'inventory-manual:'+requestId}],error:null}).then(resolve)};return q})
  const response=await GET(new NextRequest('https://example.com/api?tenantId='+tenantId+'&offset=50'),params)
  expect(response.status).toBe(200);expect(m.filters).toContainEqual(['tenant_id',tenantId]);expect(m.filters).toContainEqual(['range',50,99]);expect(m.from).toHaveBeenCalledTimes(1)
 })
})
