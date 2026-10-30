import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/sales/products/route'
import { TenantAuthError } from '@/lib/tenant-api-auth'

const mocks = vi.hoisted(() => ({ access: vi.fn(), client: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/tenant-api-auth', async original => ({ ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access }))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: mocks.client }))
vi.mock('@/lib/product-sales-server', () => ({ fetchDailyProductSales: mocks.read }))
const tenant = '2cb81ce4-1a4c-411f-aa6a-814d232b3a45'
const request = (date = '2026-03-29', id = tenant) => new NextRequest(`https://example.com/api/sales/products?tenantId=${id}&date=${date}`)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.access.mockResolvedValue({ type: 'staff', role: 'admin' })
  mocks.read.mockResolvedValue([{ key: 'id:coffee', name: 'Cafe', quantity: 2, amount: 6 }])
  mocks.client.mockReturnValue({ from: () => ({ select() { return this }, eq() { return this }, abortSignal() { return this }, retry() { return this }, maybeSingle: async () => ({ data: { country: 'ES', timezone: 'Europe/Madrid' }, error: null }) }) })
})

describe('product sales authorization', () => {
  it.each([401, 403])('rejects unauthorized access before reading service data (%s)', async status => {
    mocks.access.mockRejectedValue(new TenantAuthError('Denied', status))
    expect((await GET(request())).status).toBe(status)
    expect(mocks.client).not.toHaveBeenCalled()
  })
  it('validates dates and tenant IDs before reading', async () => {
    expect((await GET(request('2026-02-30'))).status).toBe(400)
    expect((await GET(request('2026-03-29', 'bad-tenant'))).status).toBe(400)
    expect(mocks.client).not.toHaveBeenCalled()
  })
  it('scopes the report to the authorized tenant and prevents stale caching', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.access).toHaveBeenCalledWith(tenant, { staffRoles: ['admin'], requireAdminPermission: true })
    expect(mocks.read).toHaveBeenCalledWith(expect.anything(), tenant, '2026-03-29', 'Europe/Madrid', expect.any(AbortSignal))
    expect((await response.json()).products[0].quantity).toBe(2)
  })
  it('returns an unavailable response rather than zero sales on a read failure', async () => {
    mocks.read.mockRejectedValueOnce(new Error('Database unavailable'))
    vi.spyOn(console, 'error').mockImplementationOnce(() => {})
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect((await response.json()).products).toBeUndefined()
  })
})
