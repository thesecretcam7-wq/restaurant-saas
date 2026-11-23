import { describe, expect, it } from 'vitest'
import { filterReviewTickets, reviewSummary, reviewTicket } from '../sales-review'
import { getRestaurantBusinessPeriodForDate } from '../restaurant-time'
const order = (extra = {}) => ({id:'sale',order_number:'T-123',total:'6.30',created_at:'2026-11-23T14:00:00Z',payment_status:'paid',status:'confirmed',payment_method:'cash',table_number:3,waiter_name:null,items:[{name:'Café con leche',qty:2,price:1.5}],...extra})
const actor = (extra = {}) => ({entity_id:'sale',action:'sale.registered_paid',actor_type:'staff',actor_id:'employee',actor_name:'Ana',created_at:'2026-11-23T14:00:01Z',...extra})
describe('individual sale review',()=>{
 it('preserves the saved ticket total independently of line subtotals and taxes',()=>{
  const ticket=reviewTicket(order())
  expect(ticket.total).toBe(6.3);expect(ticket.items[0].amount).toBe(3)
 })
 it('never identifies an old anonymous TPV sale as a named employee',()=>{
  expect(reviewTicket(order({waiter_name:'TPV'}))).toMatchObject({waiter:null,unidentified:true,registeredBy:null,paidBy:null})
  expect(reviewTicket(order(),[actor({actor_name:null,actor_role:'cajero'})]).unidentified).toBe(true)
 })
 it('separates waiter, registration and payment confirmation',()=>{
  const ticket=reviewTicket(order({waiter_name:'Luis'}),[
   actor({action:'order.registered',actor_name:'Luis'}),actor({action:'sale.paid',actor_name:'Ana'}),actor({entity_id:'another',actor_name:'Wrong'}),
  ])
  expect(ticket.waiter).toBe('Luis');expect(ticket.registeredBy?.name).toBe('Luis');expect(ticket.paidBy?.name).toBe('Ana')
  expect(ticket.events).toHaveLength(2)
 })
 it('shows synchronized attribution as a server registration rather than inventing the offline cashier',()=>{
  expect(reviewTicket(order(),[actor({metadata:{source:'pos-offline'}})]).registeredViaSync).toBe(true)
 })
 it('excludes paid cancellations and refunds from money collected',()=>{
  const summary=reviewSummary([reviewTicket(order()),reviewTicket(order({id:'void',status:'cancelled',total:100})),reviewTicket(order({id:'refund',payment_status:'refunded',total:200})),reviewTicket(order({id:'pending',payment_status:'pending',total:9}))])
  expect(summary).toMatchObject({paid:1,paidTotal:6.3,pending:1,pendingTotal:9,voided:2})
 })
 it('filters accent-insensitive products, table, person, status and mixed payments',()=>{
  const tickets=[reviewTicket(order({payment_method:'mixed'}),[actor()]),reviewTicket(order({id:'other',items:[{name:'Agua',quantity:1,price:2}]}))]
  const filter={search:'cafe',state:'paid',person:'Ana',payment:'mixed'}
  expect(filterReviewTickets(tickets,filter)).toHaveLength(1)
  expect(filterReviewTickets(tickets,{...filter,search:'mesa 3'})).toHaveLength(1)
  expect(filterReviewTickets(tickets,{...filter,search:'T-123'})).toHaveLength(1)
  expect(filterReviewTickets(tickets,{...filter,person:'__unknown__',search:'',payment:'all'})).toHaveLength(1)
 })
 it.each([['2026-03-28',23],['2026-10-24',25]])('respects daylight-saving boundaries for %s', (date,hours)=>{
  const period=getRestaurantBusinessPeriodForDate(date,{timeZone:'Europe/Madrid'})!
  expect((Date.parse(period.periodEnd)-Date.parse(period.periodStart))/3600000).toBe(hours)
 })
 it('rejects calendar dates which normalize into another month',()=>{
  expect(getRestaurantBusinessPeriodForDate('2026-02-31',{timeZone:'Europe/Madrid'})).toBeNull()
  expect(getRestaurantBusinessPeriodForDate('2026-13-01',{timeZone:'Europe/Madrid'})).toBeNull()
 })
})
