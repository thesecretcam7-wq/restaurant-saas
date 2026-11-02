import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OfflineOrder } from '../offline/storage'
import { saveOfflinePOSOrder, syncOfflinePOSOrders } from '../offline/pos-sync'

const mocks = vi.hoisted(() => ({ rows: [] as OfflineOrder[], save:vi.fn(), mark:vi.fn(), remove:vi.fn(), pending:vi.fn(), fetch:vi.fn<typeof fetch>() }))
vi.mock('../offline/storage',()=>({getOfflineStorage:()=>({
  savePOSOrder:async (order:OfflineOrder, operation:unknown)=>{mocks.save(order);mocks.pending(operation);mocks.rows.push(order)},
  getUnsyncedOrders:async()=>mocks.rows.filter(row=>!row.syncedAt),
  confirmPOSOrderSynced:async(id:string)=>{mocks.mark(id);mocks.remove(`pos-order-${id}`);mocks.rows.find(row=>row.id===id)!.syncedAt=new Date().toISOString()},
})}))

beforeEach(()=>{
  vi.clearAllMocks();mocks.rows=[]
  vi.stubGlobal('window',globalThis);vi.stubGlobal('fetch',mocks.fetch)
})
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})

const saveCard = ()=>saveOfflinePOSOrder({tenantId:'tenant',items:[{menu_item_id:'product',name:'Cafe',price:1,quantity:1}],subtotal:1,discount:0,total:1,paymentMethod:'stripe',deliveryType:'takeaway'})
describe('external card sales saved locally',()=>{
  it('saves the sale before any network request and synchronizes it as card, never as cash',async()=>{
    const order=await saveCard()
    expect(mocks.fetch).not.toHaveBeenCalled();expect(order.paymentMethod).toBe('stripe')
    mocks.fetch.mockResolvedValue(Response.json({orderId:'server-order'}))
    expect(await syncOfflinePOSOrders('tenant','fixture')).toMatchObject({synced:1,remaining:0})
    const sent=JSON.parse(String(mocks.fetch.mock.calls[0][1]?.body))
    expect(sent).toMatchObject({offlineClientId:order.id,paymentMethod:'stripe',source:'pos-offline'})
    expect(mocks.mark).toHaveBeenCalledWith(order.id)
  })

  it('retains an unconfirmed card sale and retries with the same idempotency key',async()=>{
    const order=await saveCard()
    mocks.fetch.mockResolvedValueOnce(Response.json({error:'Unavailable'},{status:503})).mockResolvedValueOnce(Response.json({orderId:'confirmed'}))
    expect(await syncOfflinePOSOrders('tenant')).toMatchObject({synced:0,remaining:1})
    expect(mocks.mark).not.toHaveBeenCalled();expect(mocks.rows[0].paymentMethod).toBe('stripe')
    expect(await syncOfflinePOSOrders('tenant')).toMatchObject({synced:1,remaining:0})
    for(const [,init] of mocks.fetch.mock.calls)expect(JSON.parse(String(init?.body))).toMatchObject({offlineClientId:order.id,paymentMethod:'stripe'})
  })

  it('keeps the card sale pending if an interrupted upload never confirms an order',async()=>{
    vi.useFakeTimers()
    await saveCard()
    mocks.fetch.mockImplementation((_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))))
    const result=syncOfflinePOSOrders('tenant')
    await vi.advanceTimersByTimeAsync(8_001)
    expect(await result).toMatchObject({synced:0,remaining:1})
    expect(mocks.mark).not.toHaveBeenCalled();expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
