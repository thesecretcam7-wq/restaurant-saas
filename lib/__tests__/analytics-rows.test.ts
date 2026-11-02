import {createClient} from '@supabase/supabase-js'
import {describe,expect,it,vi} from 'vitest'
import {fetchAnalyticsRows} from '../analytics-rows'
describe('bounded analytics reads',()=>{
 it('paginates all rows with stable ordering, tenant and date bounds',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(Array.from({length:1000},(_,id)=>({id})))).mockResolvedValueOnce(Response.json([{id:1000}]))
  const client=createClient('https://fixture.supabase.co','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetcher}})
  const rows=await fetchAnalyticsRows(client,'tenant','orders','id,total',{start:'2026-10-01',end:'2026-11-01'})
  expect(rows).toHaveLength(1001)
  const urls=fetcher.mock.calls.map(([url])=>new URL(String(url)))
  expect(urls[0].searchParams.get('tenant_id')).toBe('eq.tenant')
  expect(urls[0].searchParams.getAll('created_at')).toEqual(['gte.2026-10-01','lt.2026-11-01'])
  expect(urls[0].searchParams.get('order')).toBe('created_at.desc,id.asc')
  expect(urls[1].searchParams.get('offset')).toBe('1000')
 })
 it('does not return incomplete figures or retry after a database failure',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(Array.from({length:1000},()=>({id:'fixture'})))).mockResolvedValueOnce(Response.json({message:'Unavailable'},{status:503}))
  const client=createClient('https://fixture.supabase.co','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetcher}})
  await expect(fetchAnalyticsRows(client,'tenant','orders','id')).rejects.toMatchObject({message:'Unavailable'})
  expect(fetcher).toHaveBeenCalledTimes(2)
 })
})
