import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/pos/monthly-closing/route'

const mocks = vi.hoisted(() => ({ fetch: vi.fn<typeof fetch>(), access: vi.fn(), service: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: mocks.service }))
vi.mock('@/lib/tenant-api-auth', async original => ({ ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access }))

const request = () => new NextRequest('https://example.com/api/pos/monthly-closing?tenantId=tenant&month=2026-10')
const bill = { id: 'bill', supplier_name: 'Proveedor', concept: 'Alimentos', invoice_number: 'F-12', notes: 'Detalle guardado', staff_name: 'Cajero', amount: 40, paid_at: '2026-10-30T23:30:00Z', payment_method: 'external' }
let paginatedBills = false

beforeEach(() => {
  vi.clearAllMocks()
  paginatedBills = false
  mocks.access.mockResolvedValue({ type: 'owner' })
  mocks.service.mockImplementation(() => createClient('https://example.supabase.co', 'fixture', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: mocks.fetch },
  }))
  mocks.fetch.mockImplementation(async input => {
    const url = new URL(String(input)), table = url.pathname.split('/').pop()
    if (table === 'restaurant_settings') return Response.json({ country: 'ES', timezone: 'Europe/Madrid' })
    if (table === 'orders') return Response.json([
      { id: 'cash', total: 100, payment_method: 'cash', payment_status: 'paid', status: 'completed', created_at: '2026-10-30T12:00:00Z', items: [] },
      { id: 'card', total: 50, payment_method: 'stripe', payment_status: 'paid', status: 'completed', created_at: '2026-10-31T12:00:00Z', items: [] },
      { id: 'cancelled', total: 9999, payment_method: 'cash', payment_status: 'paid', status: 'cancelled', items: [] },
    ])
    if (table === 'cash_bill_payments') {
      if (!paginatedBills) return Response.json([bill])
      const offset = Number(url.searchParams.get('offset') || 0)
      return Response.json(Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({ ...bill, id: String(offset + i), amount: 1 })))
    }
    return Response.json([])
  })
})
afterEach(() => vi.restoreAllMocks())

describe('monthly closing report period and payment details', () => {
  it('uses the selected month and restaurant zone, preserving each invoice detail', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.timeZone).toBe('Europe/Madrid')
    expect(data.stats).toMatchObject({ totalSales: 150, cashSales: 100, cardSales: 50, transactionCount: 2, billPaymentsTotal: 40 })
    expect(data.stats.billPayments).toEqual([bill])
    for (const table of ['orders', 'cash_bill_payments']) {
      const url = mocks.fetch.mock.calls.map(([input]) => new URL(String(input))).find(url => url.pathname.endsWith('/'+table))!
      expect(url.searchParams.get('tenant_id')).toBe('eq.tenant')
      expect(url.searchParams.getAll(table === 'orders' ? 'created_at' : 'paid_at')).toEqual(['gte.2026-09-30T22:00:00.000Z', 'lt.2026-10-31T23:00:00.000Z'])
    }
  })

  it('includes every paid invoice beyond the Data API page limit', async () => {
    paginatedBills = true
    const data = await (await GET(request())).json()
    expect(data.stats.billPaymentsCount).toBe(1001)
    expect(data.stats.billPayments).toHaveLength(1001)
    expect(data.stats.billPaymentsTotal).toBe(1001)
    expect(data.stats.totalSales).toBe(150)
  })

  it('does not turn a permission failure on payments into zero expenses', async () => {
    const original = mocks.fetch.getMockImplementation()!
    mocks.fetch.mockImplementation((input, init) => String(input).includes('/cash_bill_payments')
      ? Promise.resolve(Response.json({ code: '42501', message: 'permission denied for table cash_bill_payments' }, { status: 403 }))
      : original(input, init))
    expect((await GET(request())).status).toBe(500)
  })
})
