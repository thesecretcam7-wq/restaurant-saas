import { describe, expect, it } from 'vitest'
import { buildOfflineCashClosing } from '../offline/cash-closing'
import type { CashClosingStats } from '../cash-closing'
import type { OfflineOrder, POSCashClosingCache } from '../offline/storage'
const stats: CashClosingStats = {cashSales:100,cardSales:20,otherSales:0,totalSales:120,billPaymentsTotal:10,billPaymentsCount:1,billPayments:[{id:'bill',supplier_name:'PAN',amount:10}],totalDeliveryFees:0,deliveryOrderCount:0,totalTax:1,totalDiscount:0,transactionCount:2,ordersCompleted:2,ordersCancelled:0,closingOrders:[],periodStart:'2026-11-25T04:00:00Z',periodEnd:'2026-11-26T04:00:00Z',businessDateLabel:'25 noviembre',operationalCloseTime:'05:00'}
const cache: POSCashClosingCache={tenantId:'tenant',mode:'current',cachedAt:'2026-11-25T12:00:00Z',stats}
const sale=(id:string,total=3,extra:Partial<OfflineOrder>={}):OfflineOrder=>({id,orderId:id,orderNumber:id,tenantId:'tenant',items:[],subtotal:total,discount:0,total,paymentMethod:'cash',source:'pos-offline',status:'completed',createdAt:'2026-11-25T12:10:00Z',...extra})
const args={tenantId:'tenant',mode:'current' as const,cache,orders:[sale('cash'),sale('card',2,{paymentMethod:'stripe'})],timeZone:'Europe/Madrid',country:'ES',now:new Date('2026-11-25T13:00:00Z')}
describe('offline cut consultation without inventing a complete closing',()=>{
 it('keeps official cached totals and local pending sales separate, even when the sale might already exist remotely',()=>{
  const result=buildOfflineCashClosing(args)
  expect(result.stats.totalSales).toBe(120);expect(result.stats.billPaymentsTotal).toBe(10)
  expect(result.preview).toMatchObject({source:'cached',cachedAt:cache.cachedAt,localSales:{count:2,cash:3,card:2,total:5}})
 })
 it('can show local sales without a cached server reading',()=>{
  const result=buildOfflineCashClosing({...args,cache:null})
  expect(result.stats).toMatchObject({cashSales:3,cardSales:2,totalSales:5,transactionCount:2})
  expect(result.preview.source).toBe('local');expect(result.preview.cachedAt).toBeNull()
 })
 it('isolates the tenant, excludes synced/pending/unrelated orders and rejects invalid amounts and dates',()=>{
  const orders=[sale('valid'),sale('other',999,{tenantId:'other'}),sale('synced',99,{syncedAt:'2026-11-25T12:20:00Z'}),sale('unpaid',80,{status:'pending'}),sale('generic',90,{source:undefined}),sale('bad',NaN),sale('negative',-2),sale('date',9,{createdAt:'invalid'})]
  const result=buildOfflineCashClosing({...args,orders,cache:{...cache,tenantId:'other'}})
  expect(result.stats.totalSales).toBe(3);expect(result.preview.source).toBe('local')
 })
 it('does not mislabel the previous operational day as the current cut',()=>{
  const result=buildOfflineCashClosing({...args,cache:{...cache,stats:{...stats,periodStart:'2026-11-24T04:00:00Z',periodEnd:'2026-11-25T04:00:00Z'}}})
  expect(result.preview.source).toBe('local');expect(result.stats.totalSales).toBe(5)
 })
 it('respects the operational cutoff before 05:00 and deduplicates local IDs',()=>{
  const result=buildOfflineCashClosing({...args,cache:null,now:new Date('2026-11-26T02:00:00Z'),orders:[sale('same'),sale('same'),sale('next',9,{createdAt:'2026-11-26T04:00:00Z'}),sale('previous',9,{createdAt:'2026-11-25T03:59:59Z'})]})
  expect(Date.parse(result.stats.periodStart)).toBe(Date.parse(stats.periodStart));expect(result.stats.totalSales).toBe(3)
 })
 it('uses the effective cached start after a same-day closing without changing the snapshot',()=>{
  const result=buildOfflineCashClosing({...args,cache:{...cache,stats:{...stats,periodStart:'2026-11-25T11:00:00Z'}}})
  expect(result.preview.source).toBe('cached');expect(result.stats.periodStart).toBe('2026-11-25T11:00:00Z')
  expect(stats.totalSales).toBe(120)
 })
 it('only opens a historical offline cut when that exact mode has a stored snapshot',()=>{
  expect(()=>buildOfflineCashClosing({...args,mode:'pending'})).toThrow('No hay una consulta')
  const result=buildOfflineCashClosing({...args,mode:'pending',cache:{...cache,mode:'pending',stats:{...stats,periodStart:'2026-11-24T04:00:00Z',periodEnd:'2026-11-25T04:00:00Z'}}})
  expect(result.preview.source).toBe('cached');expect(result.preview.localSales.count).toBe(0)
 })
})
