import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest'
import {NextRequest} from 'next/server'
import {GET,POST,PATCH} from '@/app/api/pos/cart/route'
import {GET as display,POST as grant} from '@/app/api/pos/cart/display/route'
import {TenantAuthError} from '../tenant-api-auth'
import {createDisplayGrant,verifyDisplayGrant} from '../server-signed-token'
const tid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',sessionId='session-fixture'
const m=vi.hoisted(()=>({access:vi.fn(),fetch:vi.fn<typeof fetch>(),after:[] as any[]}))
vi.mock('../pos-cart-access',()=>({requirePOSCartAccess:m.access}))
vi.mock('next/server',async original=>({...await original<typeof import('next/server')>(),after:(fn:any)=>m.after.push(fn)}))
vi.mock('../supabase/server',async()=>{const sdk=await import('@supabase/supabase-js');return{createServiceClient:()=>sdk.createClient('https://fixture.supabase.co','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:m.fetch}})}})
const cart={items:[{name:'Coffee',menu_item_id:'product',price:2,quantity:2}],subtotal:4,total:4,discount:0,cart_context:{version:1,billingOrderIds:['local-order'],loadedOrderId:null}}
const req=(method='GET',body:any=null,search='')=>new NextRequest('https://app.test/api/pos/cart'+(search?'?'+search:''),{method,...(body?{body:JSON.stringify(body)}:{})})
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CSRF_SECRET','cart-test-secret');m.after.length=0;m.access.mockResolvedValue(undefined);m.fetch.mockImplementation(async(input)=>Response.json(String(input).includes('/rpc/')?[{id}]:{id,...cart,updated_at:new Date().toISOString(),cart_session_id:sessionId,selected_staff_name:'private',cart_context:{loadedOrderId:'private'}}))})
afterEach(()=>vi.unstubAllEnvs())
describe('cart API isolation and confirmation',()=>{
 it.each([401,403])('denies access before any database read (%s)',async status=>{
  m.access.mockRejectedValue(new TenantAuthError('Unauthorized',status));expect((await GET(req('GET',null,'tenantId='+tid+'&sessionId='+sessionId))).status).toBe(status);expect(m.fetch).not.toHaveBeenCalled()
 })
 it('bounds reads to one active cart of the authorized restaurant and browser',async()=>{
  const res=await GET(req('GET',null,'tenantId='+tid+'&sessionId='+sessionId));expect(res.status).toBe(200);expect(res.headers.get('cache-control')).toBe('private, no-store')
  const url=new URL(String(m.fetch.mock.calls[0][0]));expect(url.searchParams.get('tenant_id')).toBe('eq.'+tid);expect(url.searchParams.get('cart_session_id')).toBe('eq.'+sessionId);expect(url.searchParams.get('abandoned_at')).toBe('is.null');expect(url.searchParams.get('limit')).toBe('1')
 })
 it('serializes mutations with explicit tenant, session and expected active ID',async()=>{
  const res=await PATCH(req('PATCH',{tenantId:tid,sessionId,cartId:id,cart}));expect(res.status).toBe(200)
  const p=JSON.parse(String(m.fetch.mock.calls[0][1]?.body));expect(p).toMatchObject({p_tenant_id:tid,p_session_id:sessionId,p_cart_id:id,p_mode:'update'})
  expect(p.p_payload.cart_context.billingOrderIds).toEqual(['local-order']);expect(m.after).toHaveLength(1)
 })
 it('rejects tenant substitution inside the cart',async()=>{
  expect((await POST(req('POST',{tenantId:tid,sessionId,cart:{...cart,tenant_id:other}}))).status).toBe(400);expect(m.fetch).not.toHaveBeenCalled()
 })
 it('does not confirm an update after its active cart was cleared',async()=>{
  m.fetch.mockResolvedValueOnce(Response.json([]));expect((await PATCH(req('PATCH',{tenantId:tid,sessionId,cartId:id,cart}))).status).toBe(409);expect(m.after).toHaveLength(0)
 })
 it('clears only the specified terminal without accepting a client timestamp',async()=>{
  expect((await PATCH(req('PATCH',{tenantId:tid,sessionId,action:'clear'}))).status).toBe(200)
  expect(JSON.parse(String(m.fetch.mock.calls[0][1]?.body))).toMatchObject({p_tenant_id:tid,p_session_id:sessionId,p_mode:'clear',p_payload:{}})
 })
 it('preserves legacy read-only order context using real columns',async()=>{
  expect((await POST(req('POST',{tenantId:tid,sessionId,cart:{...cart,cart_context:null,readonly:true,loaded_order_id:id}}))).status).toBe(200)
  const p=JSON.parse(String(m.fetch.mock.calls[0][1]?.body)).p_payload;expect(p.cart_context).toEqual({version:1,billingOrderIds:[id],loadedOrderId:id,readonly:true});expect(p).not.toHaveProperty('readonly');expect(p).not.toHaveProperty('loaded_order_id')
 })
 it('rejects foreign origins and invalid quantities without writing',async()=>{
  const bad=new NextRequest('https://app.test/api/pos/cart',{method:'POST',headers:{origin:'https://attacker.test'},body:'{}'});expect((await POST(bad)).status).toBe(403)
  expect((await POST(req('POST',{tenantId:tid,sessionId,cart:{...cart,items:[{name:'Bad',price:2,quantity:-1}]}}))).status).toBe(400);expect(m.fetch).not.toHaveBeenCalled()
 })
})
describe('read-only customer display grants',()=>{
 it('reads only the grant scope and returns only public display fields',async()=>{
  const token=createDisplayGrant(tid,sessionId);const r=new NextRequest('https://app.test/api/pos/cart/display?tenantId='+tid,{headers:{authorization:'Bearer '+token}})
  const res=await display(r),data=await res.json();expect(res.status).toBe(200);expect(m.access).not.toHaveBeenCalled();expect(data.cart.items).toEqual([{name:'Coffee',price:2,quantity:2}]);expect(data.cart).not.toHaveProperty('cart_context');expect(data.cart).not.toHaveProperty('selected_staff_name')
  const url=new URL(String(m.fetch.mock.calls[0][0]));expect(url.searchParams.get('tenant_id')).toBe('eq.'+tid);expect(url.searchParams.get('cart_session_id')).toBe('eq.'+sessionId)
 })
 it.each(['tenant','session','signature','expired'])('rejects %s substitution without database reads',async type=>{
  const token=createDisplayGrant(tid,sessionId,type==='expired'?Date.now()-31*86400000:Date.now())
  const res=await display(new NextRequest('https://app.test/api/pos/cart/display?tenantId='+(type==='tenant'?other:tid)+(type==='session'?'&sessionId=another-session':''),{headers:{authorization:'Bearer '+(type==='signature'?token+'x':token)}}))
  expect(res.status).toBe(403);expect(m.fetch).not.toHaveBeenCalled()
 })
 it('requires owner or verified staff access to issue a link or use an old unpaired URL',async()=>{
  m.access.mockRejectedValue(new TenantAuthError('Unauthorized',401));expect((await grant(req('POST',{tenantId:tid,sessionId}))).status).toBe(401);expect((await display(req('GET',null,'tenantId='+tid))).status).toBe(401);expect(m.fetch).not.toHaveBeenCalled()
 })
 it('does not allow a display token to authorize mutations',async()=>{
  m.access.mockRejectedValue(new TenantAuthError('Unauthorized',401));const token=createDisplayGrant(tid,sessionId)
  const r=new NextRequest('https://app.test/api/pos/cart',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({tenantId:tid,sessionId,cart})});expect((await POST(r)).status).toBe(401);expect(m.fetch).not.toHaveBeenCalled()
 })
 it('expires and separates display tokens from staff-session signatures',()=>{
  const token=createDisplayGrant(tid,sessionId);expect(verifyDisplayGrant(token)).toEqual({tenantId:tid,sessionId});expect(verifyDisplayGrant(token,Date.now()+31*86400000)).toBeNull();expect(verifyDisplayGrant('bad.invalid')).toBeNull()
 })
})
