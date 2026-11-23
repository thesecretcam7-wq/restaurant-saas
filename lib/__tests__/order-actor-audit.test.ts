import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { orderActorEventId, recordOrderActor } from '../order-actor-audit'
const calls:any[]=[]
const db={from:()=>({upsert:(data:any,options:any)=>{calls.push({data,options});return {retry(){return this},abortSignal:async()=>({error:null})}}})}
beforeEach(()=>{calls.length=0})
afterEach(()=>vi.restoreAllMocks())
describe('trusted actor logging without changing payment outcomes',()=>{
 it('creates a stable per-tenant, order and event identity',()=>{
  const id=orderActorEventId('tenant','order','paid')
  expect(id).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-5[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/)
  expect(orderActorEventId('tenant','order','paid')).toBe(id)
  expect(orderActorEventId('other','order','paid')).not.toBe(id)
 })
 it('keeps the first confirmed actor when the same payment event is retried',async()=>{
  const actor={type:'staff' as const,staffId:'staff',staffName:'Ana',role:'cajero'}
  await recordOrderActor(db as any,{tenantId:'tenant',orderId:'order',actor,stage:'registered_paid',source:'pos'})
  await recordOrderActor(db as any,{tenantId:'tenant',orderId:'order',actor:{...actor,staffName:'Another'},stage:'paid'})
  expect(calls[0].data.id).toBe(calls[1].data.id)
  expect(calls[0].data).toMatchObject({actor_id:'staff',actor_name:'Ana',tenant_id:'tenant',action:'sale.registered_paid'})
  expect(calls[0].options).toEqual({onConflict:'id',ignoreDuplicates:true})
 })
 it('does not create a named-employee event when the request has no verified actor',async()=>{
  await recordOrderActor(db as any,{tenantId:'tenant',orderId:'order',stage:'registered'})
  expect(calls).toHaveLength(0)
 })
 it('does not reject an already saved payment because audit storage is unavailable',async()=>{
  vi.spyOn(console,'warn').mockImplementation(()=>{})
  const unavailable={from:()=>{throw Error('Unavailable')}}
  await expect(recordOrderActor(unavailable as any,{tenantId:'tenant',orderId:'order',actor:{type:'staff',staffId:'staff'},stage:'paid'})).resolves.toBeUndefined()
 })
})
