import { describe, expect, it } from 'vitest'
import { fetchReviewTickets } from '../sales-review-server'
describe('bounded daily ticket reads',()=>{
 function fixture(failAudit=false,overlap=false) {
  const calls:{table:string;filters:any[];range?:number[]}[]=[]
  const db={from(table:string){
   const call:{table:string;filters:any[];range?:number[]}={table,filters:[]};calls.push(call)
   const q:any={select:()=>q,eq:(...args:any[])=>{call.filters.push(['eq',...args]);return q},gte:(...args:any[])=>{call.filters.push(['gte',...args]);return q},lt:(...args:any[])=>{call.filters.push(['lt',...args]);return q},in:(...args:any[])=>{call.filters.push(['in',...args]);return q},order:()=>q,retry:()=>q,abortSignal:()=>q,range:(a:number,b:number)=>{call.range=[a,b];return q},then:(resolve:any)=>{
    const data=table==='orders'?Array.from({length:call.range?.[0]===0?500:1},(_,index)=>({id:'order-'+((overlap&&call.range?.[0]===500?499:call.range?.[0]||0)+index),order_number:'ticket',created_at:'2026-11-23T12:00:00Z',total:1,payment_status:'paid',items:[]})):[]
    return Promise.resolve({data,error:failAudit&&table==='audit_logs'?{message:'Unavailable'}:null}).then(resolve)
   }};return q
  }}
  return {db,calls}
 }
 it('reads every page of one tenant and day, then only audits for those order IDs',async()=>{
  const {db,calls}=fixture()
  const result=await fetchReviewTickets(db as any,'tenant','start','end',new AbortController().signal)
  expect(result).toHaveLength(501)
  expect(calls.filter(c=>c.table==='orders').map(c=>c.range)).toEqual([[0,499],[500,999]])
  for(const call of calls)expect(call.filters).toContainEqual(['eq','tenant_id','tenant'])
  for(const call of calls.filter(c=>c.table==='orders')){
   expect(call.filters).toContainEqual(['gte','created_at','start']);expect(call.filters).toContainEqual(['lt','created_at','end'])
  }
  for(const call of calls.filter(c=>c.table==='audit_logs')){
   expect(call.filters).toContainEqual(['eq','entity_type','order'])
   expect(call.filters.find(f=>f[0]==='in'&&f[1]==='entity_id')![2].length).toBeLessThanOrEqual(100)
  }
 })
 it('does not turn an audit outage into anonymous but apparently complete results',async()=>{
  const {db}=fixture(true)
  await expect(fetchReviewTickets(db as any,'tenant','start','end',new AbortController().signal)).rejects.toMatchObject({message:'Unavailable'})
 })
 it('does not count a ticket twice if concurrent inserts shift an offset page',async()=>{
  const {db}=fixture(false,true)
  const result=await fetchReviewTickets(db as any,'tenant','start','end',new AbortController().signal)
  expect(result).toHaveLength(500);expect(new Set(result.map(row=>row.id)).size).toBe(500)
 })
})
