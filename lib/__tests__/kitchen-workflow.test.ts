import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchKitchenItems, kitchenBusinessPeriod } from '../kitchen-workflow'
import { buildOrderItemRows } from '../order-item-routing'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('kitchen business periods and paging', () => {
  it('uses restaurant business time, including after midnight', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T02:00:00Z'))
    expect(kitchenBusinessPeriod({timezone:'Europe/Madrid'})).toMatchObject({periodStart:'2026-11-11T04:00:00.000Z',periodEnd:'2026-11-12T04:00:00.000Z'})
    expect(kitchenBusinessPeriod({timezone:'America/Bogota'},'2026-11-11')).toMatchObject({periodStart:'2026-11-11T10:00:00.000Z',periodEnd:'2026-11-12T10:00:00.000Z'})
  })
  it('preserves the 25-hour business day across DST', () => {
    const p=kitchenBusinessPeriod({timezone:'Europe/Madrid'},'2026-10-24')
    expect(new Date(p.periodEnd).getTime()-new Date(p.periodStart).getTime()).toBe(25*3600000)
  })
  it.each(['2026-02-30','2026-13-01','bad','2026-1-1'])('rejects invalid calendar dates: %s', date => {
    expect(()=>kitchenBusinessPeriod({timezone:'Europe/Madrid'},date)).toThrow('Fecha')
  })
  it('paginates with one deadline, stable IDs and explicit historical selection', async () => {
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json(Array.from({length:500},(_,i)=>({id:String(i)}))))
      .mockResolvedValueOnce(Response.json([{id:'499'},{id:'500',payment_status:'paid',status:'pending'}]))
    vi.stubGlobal('fetch',fetcher)
    const signal=new AbortController().signal
    const result=await fetchKitchenItems('tenant','2026-10-31',signal)
    expect(result.items).toHaveLength(501)
    expect(result.items[500]).toMatchObject({payment_status:'paid',status:'pending'})
    const url=new URL(fetcher.mock.calls[1][0],'https://fixture.test')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({tenantId:'tenant',date:'2026-10-31',offset:'500',limit:'500',requiresKitchen:'true'})
    expect(url.searchParams.has('today')).toBe(false)
    expect(fetcher.mock.calls.every(([,init])=>init.signal===signal)).toBe(true)
  })
  it('stops when disabled without requesting further pages', async () => {
    const f=vi.fn().mockResolvedValue(Response.json([],{headers:{'x-kds-enabled':'false'}}));vi.stubGlobal('fetch',f)
    expect(await fetchKitchenItems('tenant','',new AbortController().signal)).toEqual({enabled:false,items:[]})
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toContain('today=1')
  })
  it('does not return partial items or retry after a failed page', async () => {
    const f=vi.fn().mockResolvedValueOnce(Response.json(Array.from({length:500},(_,i)=>({id:String(i)}))))
      .mockResolvedValueOnce(Response.json({error:'Unavailable'},{status:503}));vi.stubGlobal('fetch',f)
    await expect(fetchKitchenItems('tenant','',new AbortController().signal)).rejects.toThrow()
    expect(f).toHaveBeenCalledTimes(2)
  })
  it('preserves direct service when disabled and pending kitchen state when enabled', () => {
    const args={tenantId:'t',orderId:'o',items:[{name:'Food',price:4},{name:'Water',price:2,requires_kitchen:false}]}
    expect(buildOrderItemRows({...args,includeKitchenItems:false})).toEqual([expect.objectContaining({tenant_id:'t',name:'Water',status:'ready',requires_kitchen:false})])
    expect(buildOrderItemRows({...args,includeKitchenItems:true})).toEqual([
      expect.objectContaining({name:'Food',status:'pending'}),expect.objectContaining({name:'Water',status:'ready'})])
  })
})
