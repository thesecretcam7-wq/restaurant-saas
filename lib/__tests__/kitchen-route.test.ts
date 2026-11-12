import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH } from '@/app/api/order-items/route'
import { TenantAuthError } from '@/lib/tenant-api-auth'

const mocks=vi.hoisted(()=>({access:vi.fn(),fetch:vi.fn<typeof fetch>(),enabled:false}))
vi.mock('@/lib/tenant-api-auth',async original=>({...await original<typeof import('../tenant-api-auth')>(),requireTenantAccess:mocks.access}))
vi.mock('@/lib/supabase/database',async()=>{
  const actual=await import('@supabase/supabase-js')
  return {createClient:(url:string,key:string)=>actual.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:mocks.fetch}})}
})
vi.mock('@/lib/order-status-sync',()=>({syncOrderStatusFromItems:vi.fn()}))
vi.mock('@/lib/push-server',()=>({sendServiceReadyPushNotifications:vi.fn()}))
const request=(search='requiresKitchen=true&today=1')=>new NextRequest('https://fixture.test/api/order-items?tenantId=tenant&'+search)
const post=(items:unknown[])=>new NextRequest('https://fixture.test/api/order-items',{method:'POST',body:JSON.stringify({tenantId:'tenant',orderId:'order',items})})
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture');mocks.enabled=false
  mocks.access.mockResolvedValue({type:'staff',role:'cajero'})
  mocks.fetch.mockImplementation(async input=>{
    const table=new URL(String(input)).pathname.split('/').pop()
    return Response.json(table==='restaurant_settings'?{kds_enabled:mocks.enabled,timezone:'Europe/Madrid'}:table==='orders'?{items:[]}:[])
  })
})
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()})
describe('kitchen route tenant/config guards',()=>{
  it('does not query items when kitchen is disabled',async()=>{
    const res=await GET(request());expect(await res.json()).toEqual([]);expect(res.headers.get('x-kds-enabled')).toBe('false')
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(String(mocks.fetch.mock.calls[0][0])).toContain('/restaurant_settings')
  })
  it.each([401,403])('rejects unauthorized tenant access before data reads (%s)',async status=>{
    mocks.access.mockRejectedValueOnce(new TenantAuthError(status===401?'Unauthorized':'Forbidden',status))
    expect((await GET(request())).status).toBe(status);expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('scopes enabled kitchen to tenant, business date and bounded pages without filtering paid orders',async()=>{
    mocks.enabled=true;expect((await GET(request('requiresKitchen=true&date=2026-10-31&limit=500&offset=500'))).status).toBe(200)
    const url=new URL(String(mocks.fetch.mock.calls[1][0]))
    expect(url.searchParams.get('tenant_id')).toBe('eq.tenant');expect(url.searchParams.get('orders.tenant_id')).toBe('eq.tenant')
    expect(url.searchParams.getAll('orders.created_at')).toEqual(['gte.2026-10-31T04:00:00.000Z','lt.2026-11-01T04:00:00.000Z'])
    expect(url.searchParams.get('offset')).toBe('500');expect(url.searchParams.get('limit')).toBe('500')
    expect(url.searchParams.has('orders.payment_status')).toBe(false)
    expect(url.searchParams.get('select')).toContain('orders!inner')
  })
  it('keeps direct service readable with kitchen off',async()=>{
    expect((await GET(request('requiresKitchen=false&today=1'))).status).toBe(200)
    const url=new URL(String(mocks.fetch.mock.calls[1][0]));expect(url.searchParams.get('requires_kitchen')).toBe('eq.false')
  })
  it('does not insert kitchen rows with the legacy POST when disabled',async()=>{
    expect((await POST(post([{name:'Food',price:4}]))).status).toBe(201)
    expect(mocks.fetch.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false)
  })
  it('keeps enabled kitchen rows pending, scoped to tenant, without changing financial rows',async()=>{
    mocks.enabled=true;expect((await POST(post([{name:'Food',price:4}]))).status).toBe(201)
    const call=mocks.fetch.mock.calls.find(([,init])=>init?.method==='POST')!
    expect(new URL(String(call[0])).pathname).toBe('/rest/v1/order_items')
    expect(JSON.parse(String(call[1]?.body))).toEqual([expect.objectContaining({tenant_id:'tenant',order_id:'order',status:'pending',requires_kitchen:true})])
  })
  it('rejects kitchen actions after kitchen has been disabled',async()=>{
    const res=await PATCH(new NextRequest('https://fixture.test/api/order-items',{method:'PATCH',body:JSON.stringify({tenantId:'tenant',orderId:'order',status:'ready',kitchenOnly:true})}))
    expect(res.status).toBe(409);expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
