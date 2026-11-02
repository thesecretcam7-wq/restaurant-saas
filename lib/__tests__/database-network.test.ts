import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createDatabaseFetch } from '../supabase/database-network'

const url = 'https://project.supabase.co/rest/v1/orders'
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})

describe('database read protection',()=>{
  it('contains real SDK read retries locally when the database fails',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({message:'Down'},{status:503}))
    const client=createClient('https://project.supabase.co','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createDatabaseFetch(fetcher)}})
    const result=await client.from('orders').select('id')
    expect(result.error?.code).toBe('DB_UNAVAILABLE');expect(result.status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('pauses repeated reads, probes once and recovers after a successful response',async()=>{
    vi.useFakeTimers()
    let resolveProbe!:(response:Response)=>void
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('',{status:522})).mockImplementationOnce(()=>new Promise(resolve=>{resolveProbe=resolve})).mockImplementation(async()=>Response.json([]))
    const guarded=createDatabaseFetch(fetcher)
    expect((await guarded(url)).status).toBe(503)
    for(let i=0;i<20;i++)expect((await guarded(url)).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(15_001)
    const probe=guarded(url)
    expect((await guarded(url)).status).toBe(503)
    expect(fetcher).toHaveBeenCalledTimes(2)
    resolveProbe(Response.json([{id:'recovered'}]));expect(await (await probe).json()).toEqual([{id:'recovered'}])
    expect((await guarded(url)).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('bounds a stalled read and suppresses the subsequent network attempts',async()=>{
    vi.useFakeTimers()
    const fetcher=vi.fn<typeof fetch>((_input,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))))
    const guarded=createDatabaseFetch(fetcher),pending=guarded(url)
    await vi.advanceTimersByTimeAsync(8_001)
    expect((await pending).status).toBe(503)
    expect((await guarded(url)).status).toBe(503);expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('also bounds reading a body that stalls after receiving the headers',async()=>{
    vi.useFakeTimers()
    const fetcher=vi.fn<typeof fetch>(async(_input,init)=>new Response(new ReadableStream({start(controller){init?.signal?.addEventListener('abort',()=>controller.error(new DOMException('Aborted','AbortError')))}})))
    const pending=createDatabaseFetch(fetcher)(url)
    await vi.advanceTimersByTimeAsync(8_001);expect((await pending).status).toBe(503)
  })

  it('keeps writes and other services unchanged even during a read outage',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('',{status:503})).mockImplementation(async()=>Response.json({ok:true}))
    const guarded=createDatabaseFetch(fetcher)
    await guarded(url)
    for(const method of ['POST','PATCH','DELETE']){
      const init={method,body:'{}',signal:new AbortController().signal}
      expect((await guarded(url,init)).status).toBe(200)
      expect(fetcher.mock.lastCall?.[1]).toBe(init)
    }
    await guarded('https://project.supabase.co/storage/v1/object/images')
    expect(fetcher).toHaveBeenCalledTimes(5)
  })

  it('honors cancellation and does not label caller cancellation as a database outage',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>{init?.signal?.throwIfAborted();return Response.json([])})
    const guarded=createDatabaseFetch(fetcher)
    await expect(guarded(url,{signal:AbortSignal.abort()})).rejects.toThrow()
    expect((await guarded(url)).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it.each([400,401,403,404,409,500])('does not turn HTTP %s into an origin-wide outage',async status=>{
    const fetcher=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({message:'Normal error'},{status}))
    const guarded=createDatabaseFetch(fetcher)
    expect((await guarded(url)).status).toBe(status)
    expect((await guarded(url)).status).toBe(status);expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('preserves range/count headers and never shares response data between users',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>Response.json([{owner:new Headers(init?.headers).get('authorization')}],{headers:{'content-range':'0-0/1500'}}))
    const guarded=createDatabaseFetch(fetcher)
    const first=await guarded(url,{headers:{authorization:'user-one'}}),second=await guarded(url,{headers:{authorization:'user-two'}})
    expect(first.headers.get('content-range')).toBe('0-0/1500')
    expect(await first.json()).toEqual([{owner:'user-one'}]);expect(await second.json()).toEqual([{owner:'user-two'}])
  })
})
