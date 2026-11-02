import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({query:vi.fn()}))
vi.mock('../supabase/server',()=>({createServiceClient:()=>({from:()=>({select(){return this},eq(){return this},maybeSingle:mocks.query})})}))
beforeEach(()=>{vi.resetModules();vi.clearAllMocks()})
afterEach(()=>vi.restoreAllMocks())
describe('tenant lookup cache',()=>{
 it('shares an in-flight lookup without caching a failure as a missing restaurant',async()=>{
  const spy=vi.spyOn(console,'error').mockImplementation(()=>{})
  mocks.query.mockResolvedValueOnce({data:null,error:{message:'Down'}}).mockResolvedValue({data:{id:'tenant',slug:'fixture'},error:null})
  const {getTenantBySlug}=await import('../tenant')
  expect(await getTenantBySlug('fixture')).toBeNull()
  expect(await getTenantBySlug('fixture')).toMatchObject({id:'tenant'})
  expect(await getTenantBySlug('fixture')).toMatchObject({id:'tenant'})
  expect(mocks.query).toHaveBeenCalledTimes(2);spy.mockRestore()
 })
 it('coalesces simultaneous requests for the same restaurant',async()=>{
  let release!:(result:unknown)=>void
  mocks.query.mockImplementation(()=>new Promise(resolve=>{release=resolve}))
  const {getTenantBySlug}=await import('../tenant')
  const a=getTenantBySlug('fixture'),b=getTenantBySlug('fixture')
  expect(mocks.query).toHaveBeenCalledTimes(1)
  release({data:{id:'tenant'},error:null})
  expect(await a).toEqual(await b)
 })
})
