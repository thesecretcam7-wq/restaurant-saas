import{beforeEach,afterEach,describe,it,expect,vi}from'vitest'
import{createPOSCartClient}from'../pos-cart-api-client'
import{saveCartToSupabase}from'../pos-cart-sync'
beforeEach(()=>{vi.stubGlobal('BroadcastChannel',undefined)})
afterEach(()=>vi.unstubAllGlobals())
describe('browser cart adapter',()=>{
 it('routes reads and writes exclusively through the authorized API with fixed scope',async()=>{
  const f=vi.fn().mockResolvedValueOnce(Response.json({cart:{id:'cart'}})).mockResolvedValueOnce(Response.json({cart:{id:'cart'}}));vi.stubGlobal('fetch',f)
  const client=createPOSCartClient()
  await client.from('pos_carts').select('id').eq('tenant_id','tenant').eq('cart_session_id','session-browser').is('abandoned_at',null).maybeSingle()
  const r=await client.from('pos_carts').update({items:[],subtotal:0,total:0}).eq('id','cart').eq('tenant_id','tenant').eq('cart_session_id','session-browser').select('id').maybeSingle()
  expect(r.data).toEqual({id:'cart'});expect(String(f.mock.calls[0][0])).toContain('/api/pos/cart?tenantId=tenant&sessionId=session-browser')
  expect(JSON.parse(f.mock.calls[1][1].body)).toMatchObject({tenantId:'tenant',sessionId:'session-browser',cartId:'cart',action:'save'})
  expect(f.mock.calls.every(([,init])=>init.credentials==='same-origin'&&init.cache==='no-store')).toBe(true)
 })
 it('does not report an unconfirmed write as success',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'Unavailable'},{status:503})))
  const r=await createPOSCartClient().from('pos_carts').insert({tenant_id:'t',cart_session_id:'session-browser',items:[]})
  expect(r.error.status).toBe(503);expect(r.data).toBeNull()
 })
 it('keeps included tax out of the mirror total instead of adding VAT twice',async()=>{
  vi.stubGlobal('window',{});vi.stubGlobal('localStorage',{getItem:()=> 'session-fixture'})
  const q:any={eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null})},insert=vi.fn().mockResolvedValue({error:null})
  await saveCartToSupabase('tenant',{items:[{menu_item_id:'coffee',name:'Coffee',price:2,quantity:2}],discount:0,discountCode:'',paymentMethod:'cash',posMode:'simple',selectedStaffId:null,selectedStaffName:'',selectedTableId:null,selectedTableNumber:null,taxRate:10,taxIncluded:true},{from:()=>({select:()=>q,insert})})
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({subtotal:4,total:4}))
 })
})
