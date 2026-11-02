import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/purchase-invoices/route'

const mocks = vi.hoisted(() => ({ access: vi.fn(), fetch: vi.fn<typeof fetch>() }))
vi.mock('@/lib/tenant-api-auth', async original => ({
  ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access,
}))
vi.mock('@supabase/supabase-js', async original => {
  const actual = await original<typeof import('@supabase/supabase-js')>()
  return { ...actual, createClient: (url: string, key: string) => actual.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: mocks.fetch },
  }) }
})

const request = (month = '2026-10') => new NextRequest(`https://example.com/api/purchase-invoices?tenantId=tenant${month ? `&month=${month}` : ''}`)
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture')
  mocks.access.mockResolvedValue({ type: 'owner' })
  mocks.fetch.mockImplementation(async input => {
    const table = new URL(String(input)).pathname.split('/').pop()
    const rows = table === 'tenants' ? { country:'ES' }
      : table === 'restaurant_settings' ? { country:'ES', timezone:'Europe/Madrid' }
        : table === 'orders' ? [
          { id:'sale', total:100, created_at:'2026-10-30T12:00:00Z', payment_method:'cash', payment_status:'paid', status:'confirmed' },
          { id:'other-month', total:999, created_at:'2026-11-01T12:00:00Z', payment_method:'cash', payment_status:'paid', status:'confirmed' },
        ] : table === 'cash_bill_payments' ? [
          { id:'late-30', amount:40, supplier_name:'Pago Paco', paid_at:'2026-10-30T12:00:00Z', payment_method:'external' },
          { id:'late-31', amount:40, supplier_name:'Pago Paco', paid_at:'2026-10-31T12:00:00Z', payment_method:'external' },
          { id:'cash', amount:10, paid_at:'2026-10-30T13:00:00Z', payment_method:'cash', cash_closing_id:'closed' },
          { id:'november', amount:999, paid_at:'2026-11-01T12:00:00Z', payment_method:'external' },
        ] : []
    return Response.json(rows)
  })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe('purchase month selection', () => {
  it('shows late registered payments in their paid month, grouped by day with cash and external totals', async () => {
    const response = await GET(request()); expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.period).toEqual({ month:'2026-10', timeZone:'Europe/Madrid' })
    expect(data.dailyFinance).toHaveLength(31)
    expect(data.dailyFinance[29]).toMatchObject({ date:'2026-10-30', orders:1, billPaymentsTotal:50, billPaymentsExternal:40, billPaymentsCash:10 })
    expect(data.dailyFinance[30]).toMatchObject({ date:'2026-10-31', billPaymentsTotal:40 })
    expect(data.billPaymentsSummary).toMatchObject({ paidThisMonth:90, countThisMonth:3, externalThisMonth:80, paidToday:0 })
    expect(data.salesSummary.salesThisMonth).toBe(100)
    expect(data.billPaymentsSummary.payments.map((p: {id:string})=>p.id)).not.toContain('november')
    expect(mocks.access).toHaveBeenCalledWith('tenant', { staffRoles:['admin'], requireAdminPermission:true })
  })

  it('bounds orders, payments and closed-order links to the selected month, including DST', async () => {
    await GET(request())
    for(const [table,column] of [['orders','created_at'],['cash_bill_payments','paid_at'],['cash_closing_items','orders.created_at']]) {
      const url = mocks.fetch.mock.calls.map(([u])=>new URL(String(u))).find(u=>u.pathname.endsWith('/'+table))!
      expect(url.searchParams.getAll(column)).toEqual(['gte.2026-09-30T22:00:00.000Z','lt.2026-10-31T23:00:00.000Z'])
      expect(url.searchParams.get('tenant_id')).toBe('eq.tenant')
    }
  })

  it('keeps current month as default and limits days to today', async () => {
    const data = await (await GET(request(''))).json()
    expect(data.period.month).toBe('2026-11'); expect(data.dailyFinance).toHaveLength(2)
    expect(data.billPaymentsSummary).toMatchObject({ paidThisMonth:999, countThisMonth:1 })
  })

  it('includes every day of a leap February', async () => {
    const data = await (await GET(request('2024-02'))).json()
    expect(data.dailyFinance).toHaveLength(29); expect(data.dailyFinance[28].date).toBe('2024-02-29')
  })

  it.each(['2026-13','2026-00','bad','2026-10-01'])('rejects invalid month %s before database reads', async month => {
    expect((await GET(request(month))).status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('does not turn a data failure into a zero monthly balance', async () => {
    mocks.fetch.mockImplementation(async () => Response.json({message:'Query unavailable'},{status:400}))
    const spy = vi.spyOn(console,'error').mockImplementation(()=>{})
    expect((await GET(request())).status).toBe(500); spy.mockRestore()
  })
})
