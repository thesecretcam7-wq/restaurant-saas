import {readFileSync}from'node:fs'
import {runInNewContext}from'node:vm'
import {describe,it,expect,vi}from'vitest'
function worker(){
 const events=new Map<string,any>(),fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json({cart:{id:'33333333-3333-4333-8333-333333333333',items:[],total:0}})),deleted=vi.fn()
 runInNewContext(readFileSync('public/sw.js','utf8'),{self:{navigator:{onLine:true},clients:{claim:vi.fn()},addEventListener:(name:string,fn:any)=>events.set(name,fn)},location:{origin:'https://app.test',hostname:'app.test'},caches:{keys:async()=>['eccofood-v21','eccofood-v22','eccofood-v23'],delete:deleted},fetch:fetcher,URL,URLSearchParams,Request,Response,AbortController,setTimeout,clearTimeout,console})
 return{fetcher,deleted,async request(request:Request){let response:any;events.get('fetch')({request,respondWith:(value:any)=>response=value});return response?await response:undefined},async activate(){let promise:any;events.get('activate')({waitUntil:(p:any)=>promise=p});await promise}}
}
const base='https://csdooyggiuhzovehykna.supabase.co/rest/v1/pos_carts'
describe('legacy terminal cart bridge',()=>{
 it('forwards scoped legacy reads through the private API without forwarding database keys',async()=>{
  const w=worker(),r=await w.request(new Request(base+'?tenant_id=eq.tenant&cart_session_id=eq.session-legacy&select=id',{headers:{authorization:'Bearer old-public-key',apikey:'old-public-key'}}))
  expect(await r.json()).toEqual([{id:'33333333-3333-4333-8333-333333333333'}])
  const [input,init]=w.fetcher.mock.calls[0];expect(String(input)).toBe('https://app.test/api/pos/cart?tenantId=tenant&sessionId=session-legacy');expect(init?.credentials).toBe('same-origin');expect(new Headers(init?.headers).has('authorization')).toBe(false)
 })
 it('recovers a legacy ID-only update scope from its previous authorized read',async()=>{
  const w=worker();await w.request(new Request(base+'?tenant_id=eq.tenant&cart_session_id=eq.session-legacy&select=id'))
  w.fetcher.mockResolvedValueOnce(Response.json({cart:{id:'33333333-3333-4333-8333-333333333333'}}))
  const r=await w.request(new Request(base+'?id=eq.33333333-3333-4333-8333-333333333333',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[],subtotal:0,total:0})}))
  expect(r.status).toBe(204);expect(JSON.parse(String(w.fetcher.mock.calls[1][1]?.body))).toMatchObject({tenantId:'tenant',sessionId:'session-legacy',cartId:'33333333-3333-4333-8333-333333333333'})
 })
 it('rejects unknown ID-only writes and deletion without reaching the database',async()=>{
  const w=worker();expect((await w.request(new Request(base+'?id=eq.unknown',{method:'PATCH',body:'{}'}))).status).toBe(409)
  expect((await w.request(new Request(base,{method:'DELETE'}))).status).toBe(403);expect(w.fetcher).not.toHaveBeenCalled()
 })
 it('uses authenticated display access for old same-browser screen URLs',async()=>{
  const w=worker();await w.request(new Request(base+'?tenant_id=eq.tenant&select=items,total'));expect(String(w.fetcher.mock.calls[0][0])).toContain('/api/pos/cart/display?tenantId=tenant')
 })
 it('does not intercept other projects or unrelated tables',async()=>{
  const w=worker();expect(await w.request(new Request(base.replace('csdooyggiuhzovehykna','other')))).toBeUndefined()
  expect(await w.request(new Request(base.replace('pos_carts','orders')))).toBeUndefined();expect(w.fetcher).not.toHaveBeenCalled()
 })
 it('retains the previous offline cache for already-open terminals',async()=>{
  const w=worker();await w.activate();expect(w.deleted).toHaveBeenCalledWith('eccofood-v21');expect(w.deleted).not.toHaveBeenCalledWith('eccofood-v22')
 })
})
