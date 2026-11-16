import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InventorySaveError, pendingInventoryCommand, saveInventoryCommand, type InventoryCommand } from '../inventory-client'
const tenantId='11111111-1111-4111-8111-111111111111'
const command:InventoryCommand={kind:'movement',tenantId,itemId:'22222222-2222-4222-8222-222222222222',body:{tenantId,requestId:'33333333-3333-4333-8333-333333333333',quantity:2,movementType:'purchase'}}
const storage=new Map<string,string>(),fetchMock=vi.fn()
beforeEach(()=>{
 storage.clear();vi.clearAllMocks();vi.stubGlobal('fetch',fetchMock);vi.stubGlobal('navigator',{})
 vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)||null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)})
})
afterEach(()=>vi.unstubAllGlobals())
describe('inventory confirmation recovery',()=>{
 it('retains an ambiguous request and resolves the exact reference after retry',async()=>{
  fetchMock.mockRejectedValueOnce(Error('Disconnected')).mockResolvedValueOnce(Response.json({updated:{id:command.itemId}}))
  await expect(saveInventoryCommand(command)).rejects.toMatchObject({uncertain:true})
  expect(pendingInventoryCommand(tenantId)?.body.requestId).toBe(command.body.requestId)
  await saveInventoryCommand(pendingInventoryCommand(tenantId)!)
  expect(pendingInventoryCommand(tenantId)).toBeNull()
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).requestId).toBe(command.body.requestId)
 })
 it.each([401,403,503])('keeps the reference after %s so a former successful save can be checked',async status=>{
  fetchMock.mockResolvedValue(Response.json({error:'Unavailable'},{status}))
  await expect(saveInventoryCommand(command)).rejects.toBeInstanceOf(InventorySaveError)
  expect(pendingInventoryCommand(tenantId)).not.toBeNull()
 })
 it('clears a definitively rejected count while preserving other tenant state',async()=>{
  fetchMock.mockResolvedValue(Response.json({error:'STOCK_CHANGED'},{status:409}))
  storage.set('other-tenant','preserved')
  await expect(saveInventoryCommand(command)).rejects.toMatchObject({uncertain:false,status:409})
  expect(pendingInventoryCommand(tenantId)).toBeNull();expect(storage.get('other-tenant')).toBe('preserved')
 })
 it('does not overwrite a different outstanding operation',async()=>{
  fetchMock.mockRejectedValue(Error('Disconnected'));await saveInventoryCommand(command).catch(()=>{})
  await expect(saveInventoryCommand({...command,body:{...command.body,requestId:'44444444-4444-4444-8444-444444444444'}})).rejects.toMatchObject({uncertain:false})
  expect(fetchMock).toHaveBeenCalledTimes(1);expect(pendingInventoryCommand(tenantId)?.body.requestId).toBe(command.body.requestId)
 })
})
