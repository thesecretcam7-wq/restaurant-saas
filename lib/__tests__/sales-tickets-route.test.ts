import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sales/tickets/route'
import { TenantAuthError } from '../tenant-auth-error'
const tenant='11111111-1111-4111-8111-111111111111'
const m=vi.hoisted(()=>({access:vi.fn(),tickets:vi.fn(),from:vi.fn()}))
vi.mock('../tenant-api-auth',async original=>({...await original<typeof import('../tenant-api-auth')>(),requireTenantAccess:m.access}))
vi.mock('../sales-review-server',()=>({fetchReviewTickets:m.tickets}))
vi.mock('../supabase/server',()=>({createServiceClient:()=>({from:m.from})}))
beforeEach(()=>{
 vi.clearAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-23T01:00:00Z'))
 m.access.mockResolvedValue({type:'owner'});m.tickets.mockResolvedValue([])
 m.from.mockImplementation((table:string)=>{const q:any={select:()=>q,eq:()=>q,retry:()=>q,abortSignal:()=>q,maybeSingle:async()=>({data:table==='tenants'?{country:'ES'}:{country:'ES',timezone:'Europe/Madrid'},error:null})};return q})
})
afterEach(()=>vi.useRealTimers())
const request=(date='')=>new NextRequest('https://example.com/api/sales/tickets?tenantId='+tenant+(date?'&date='+date:''))
describe('daily ticket API access and dates',()=>{
 it('uses the previous operational day before 05:00 and sends private responses',async()=>{
  const response=await GET(request()),body=await response.json()
  expect(response.status).toBe(200);expect(body).toMatchObject({date:'2026-11-22',tenantId:tenant,today:'2026-11-22',currency:'EUR'})
  expect(m.tickets.mock.calls[0].slice(1,4)).toEqual([tenant,'2026-11-22T04:00:00.000Z','2026-11-23T04:00:00.000Z'])
  expect(response.headers.get('cache-control')).toContain('no-store')
 })
 it.each(['2026-02-31','2026-11-24'])('rejects invalid or future day %s without fetching tickets',async date=>{
  expect((await GET(request(date))).status).toBe(400);expect(m.tickets).not.toHaveBeenCalled()
 })
 it('does not query any tenant data when authorization fails',async()=>{
  m.access.mockRejectedValue(new TenantAuthError('Unauthorized',401))
  expect((await GET(request())).status).toBe(401);expect(m.from).not.toHaveBeenCalled()
 })
 it('does not report zero sales when the database is unavailable',async()=>{
  m.tickets.mockRejectedValue(Error('Unavailable'))
  const response=await GET(request());expect(response.status).toBe(503)
  expect((await response.json()).tickets).toBeUndefined()
 })
})
