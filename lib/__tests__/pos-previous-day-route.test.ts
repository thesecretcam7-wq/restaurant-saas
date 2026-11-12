import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/orders/route'
import { TenantAuthError } from '@/lib/tenant-api-auth'

const mocks = vi.hoisted(() => ({ access: vi.fn(), inserts: vi.fn(), tables: vi.fn(), after: [] as (() => Promise<unknown>)[], settingsError: null as null | { message: string } }))
vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: (fn: () => Promise<unknown>) => mocks.after.push(fn) }))
vi.mock('@/lib/checkPlan', () => ({ canCreateOrder: async () => ({ allowed: true }) }))
vi.mock('@/lib/csrf', () => ({ verifyCSRFToken: async () => true, sendCSRFErrorResponse: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ orderLimiter: {}, checkRateLimit: async () => ({ allowed: true }), getClientIp: () => 'fixture' }))
vi.mock('@/lib/email', () => ({ sendOrderConfirmation: vi.fn(), sendNewOrderNotification: vi.fn(), sendOrderStatusUpdate: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ sendWhatsAppOrderConfirmation: vi.fn() }))
vi.mock('@/lib/push-server', () => ({ sendServiceReadyPushNotifications: vi.fn() }))
vi.mock('@/lib/customer-sync', () => ({ syncCustomerFromOrder: vi.fn() }))
vi.mock('@/lib/tenant-api-auth', async original => ({ ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access }))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ from(table: string) {
  mocks.tables(table)
  let row: Record<string, unknown> | null = null
  const q: any = new Proxy({}, { get(_target, key) {
    if (key === 'insert') return (value: Record<string, unknown>) => { row = value; mocks.inserts(table, value); return q }
    if (key === 'then') return (resolve: (r: unknown) => unknown) => Promise.resolve(resolve({
      data: table === 'tenants' ? { id: 'tenant', status: 'active', subscription_plan: 'premium' }
        : table === 'restaurant_settings' ? { timezone: 'America/Bogota', country: 'CO', tax_rate: 0, kds_enabled: true }
          : table === 'menu_items' ? [{ id: 'product', name: 'Cafe', price: 10, available: true }]
            : table === 'orders' && row ? { id: 'created-order', ...row } : [],
      error: table === 'restaurant_settings' ? mocks.settingsError : null,
      count: 0,
    }))
    return () => q
  } })
  return q
} }) }))

const request = (overrides = {}) => new NextRequest('https://example.com/api/orders', {
  method: 'POST', body: JSON.stringify({ tenantId: 'tenant', source: 'pos', customerInfo: { name: 'POS' }, items: [{ menu_item_id: 'product', qty: 2, price: 10 }], paymentMethod: 'cash', deliveryType: 'takeaway', businessDateMode: 'previous_day', businessDate: '2026-10-31', ...overrides }),
})
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T16:00:00Z'))
  mocks.after.length = 0; mocks.settingsError = null; mocks.access.mockResolvedValue({ type: 'staff', staffId: 'cashier', role: 'cajero' })
})
afterEach(() => vi.useRealTimers())

describe('previous-day order registration', () => {
  it('saves one paid sale in yesterday without requiring an open closing, preserving the actual registration time', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.access).toHaveBeenCalledWith('tenant', { staffRoles: ['admin', 'cajero'] })
    const row = mocks.inserts.mock.calls.find(([table]) => table === 'orders')?.[1]
    expect(row).toMatchObject({ tenant_id: 'tenant', created_at: '2026-11-01T04:59:59.999Z', updated_at: '2026-11-01T16:00:00.000Z', total: 20, payment_status: 'paid', payment_method: 'cash' })
    expect(row.notes).toContain('Venta del día 2026-10-31 registrada desde TPV el')
    expect(mocks.tables).not.toHaveBeenCalledWith('cash_closings')
    expect(mocks.tables).not.toHaveBeenCalledWith('cash_closing_items')
    for (const callback of mocks.after) await callback()
    expect(mocks.inserts.mock.calls.filter(([table]) => table === 'orders')).toHaveLength(1)
    expect(mocks.inserts).not.toHaveBeenCalledWith('order_items', expect.anything())
  })
  it('rejects a changed date before inserting any sale', async () => {
    expect((await POST(request({ businessDate: '2026-10-30' }))).status).toBe(409)
    expect(mocks.inserts).not.toHaveBeenCalled()
  })
  it('rejects public sources and unauthorized cashiers', async () => {
    expect((await POST(request({ source: 'store' }))).status).toBe(403)
    expect(mocks.inserts).not.toHaveBeenCalled()
    mocks.access.mockRejectedValueOnce(new TenantAuthError('Unauthorized', 401))
    expect((await POST(request())).status).toBe(401)
    expect(mocks.inserts).not.toHaveBeenCalled()
  })
  it('fails rather than guessing a timezone when settings are unavailable', async () => {
    mocks.settingsError = { message: 'Unavailable' }
    expect((await POST(request())).status).toBe(503)
    expect(mocks.inserts).not.toHaveBeenCalled()
  })
  it('keeps today registrations free of any backdated timestamp or audit note', async () => {
    expect((await POST(request({ businessDateMode: undefined, businessDate: undefined }))).status).toBe(200)
    const row = mocks.inserts.mock.calls.find(([table]) => table === 'orders')?.[1]
    expect(row.created_at).toBeUndefined()
    expect(row.notes).toBeNull()
  })
  it('keeps the original local sale time when uploading after an outage', async () => {
    const originalTime = '2026-10-31T23:00:00.000Z'
    const response = await POST(request({ source:'pos-offline', offlineClientId:'local-fixture', offlineCreatedAt:originalTime, businessDateMode:undefined, businessDate:undefined }))
    expect(response.status).toBe(200)
    const row = mocks.inserts.mock.calls.find(([table])=>table==='orders')?.[1]
    expect(row).toMatchObject({created_at:originalTime,updated_at:'2026-11-01T16:00:00.000Z',payment_status:'paid',offline_client_id:'local-fixture'})
    expect(row.notes).toContain(`Venta local del ${originalTime} sincronizada desde TPV el `)
    mocks.tables.mockClear()
    for (const callback of mocks.after) await callback()
    expect(mocks.tables).not.toHaveBeenCalledWith('tenant_branding')
    expect(mocks.tables).not.toHaveBeenCalledWith('tenants')
    expect(mocks.tables).not.toHaveBeenCalledWith('restaurant_settings')
    expect(mocks.inserts).toHaveBeenCalledWith('order_items',expect.arrayContaining([expect.objectContaining({tenant_id:'tenant',status:'pending'})]))
  })
  it.each(['invalid','2030-01-01T00:00:00Z'])('does not insert an offline sale with an invalid date %s', async offlineCreatedAt => {
    expect((await POST(request({source:'pos-offline',offlineClientId:'local-fixture',offlineCreatedAt,businessDateMode:undefined,businessDate:undefined}))).status).toBe(400)
    expect(mocks.inserts).not.toHaveBeenCalled()
  })
})
