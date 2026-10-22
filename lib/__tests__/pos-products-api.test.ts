import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  access: vi.fn(), csrf: vi.fn(), from: vi.fn(), inventory: vi.fn(), insert: vi.fn(),
  update: vi.fn(), remove: vi.fn(), filters: vi.fn(),
  category: true, staff: true, conflict: false, stored: null as Record<string, unknown> | null,
}))
vi.mock('@/lib/tenant-api-auth', async original => ({
  ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access,
}))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/csrf', async original => ({ ...await original<typeof import('../csrf')>(), verifyCSRFToken: mocks.csrf }))
vi.mock('@/lib/inventory-sync', () => ({ ensureInventoryItemForMenuItem: mocks.inventory }))

import * as products from '../../app/api/pos/products/route'
import { PATCH, DELETE } from '../../app/api/products/[id]/route'
import { TenantAuthError } from '../tenant-api-auth'
import { posProductInput } from '../pos-product-input'

const tenantId = '2cb81ce4-1a4c-411f-aa6a-814d232b3a45'
const categoryId = '11111111-1111-4111-8111-111111111111'
const requestId = '22222222-2222-4222-8222-222222222222'
const payload = { tenantId, requestId, name: 'Cafe nuevo', price: 3.5, categoryId, showInStore: false }
const request = (body: unknown = payload) => new NextRequest('http://localhost/api/pos/products', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.category = true; mocks.staff = true; mocks.conflict = false; mocks.stored = null
  mocks.csrf.mockResolvedValue(true)
  mocks.access.mockResolvedValue({ type: 'staff', staffId: 'staff-1', role: 'cajero' })
  mocks.inventory.mockResolvedValue({ id: 'inventory-1' })
  mocks.from.mockImplementation((table: string) => {
    let mode = 'read'
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(function (this: unknown, ...args: unknown[]) { mocks.filters(...args); return this }),
      abortSignal: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(), retry: vi.fn().mockReturnThis(),
      insert: vi.fn(function (this: unknown, row: Record<string, unknown>) {
        mocks.insert(row); mode = 'insert'
        if (!mocks.conflict) mocks.stored = { ...row, image_url: null }
        return this
      }),
      update: vi.fn(function (this: unknown, row: unknown) { mocks.update(row); mode = 'update'; return this }),
      delete: vi.fn(function (this: unknown) { mocks.remove(); mode = 'delete'; return this }),
      then(resolve: (result: unknown) => unknown) {
        const result = table === 'staff_members' ? { data: mocks.staff ? { id: 'staff-1' } : null, error: null }
          : table === 'menu_categories' ? { data: mocks.category ? { id: categoryId } : null, error: null }
            : mode === 'insert' && mocks.conflict ? { data: null, error: { code: '23505' } }
              : { data: mocks.stored || { tenant_id: tenantId }, error: null }
        return Promise.resolve(result).then(resolve)
      },
    }
    return query
  })
})
afterEach(() => vi.restoreAllMocks())

describe('create-only products from POS', () => {
  it('creates a permanent catalog product for a cashier, linked to this tenant and category', async () => {
    const response = await products.POST(request())
    expect(response.status).toBe(201)
    expect((await response.json()).item).toMatchObject({ id: requestId, name: 'Cafe nuevo', category_id: categoryId })
    expect(mocks.access).toHaveBeenCalledWith(tenantId, { staffRoles: ['admin', 'cajero'], requireAdminPermission: true })
    expect(mocks.filters).toHaveBeenCalledWith('tenant_id', tenantId)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenantId, available: true, show_in_store: false }))
    expect(mocks.inventory).toHaveBeenCalledOnce()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('rejects a missing CSRF token before checking credentials or writing', async () => {
    mocks.csrf.mockResolvedValue(false)
    expect((await products.POST(request())).status).toBe(403)
    expect(mocks.access).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('also allows the verified owner to add products', async () => {
    mocks.access.mockResolvedValueOnce({ type: 'owner', userId: 'owner-1' })
    expect((await products.POST(request())).status).toBe(201)
    expect(mocks.from).not.toHaveBeenCalledWith('staff_members')
  })

  it.each([401, 403])('rejects absent or foreign-tenant credentials (%i)', async status => {
    mocks.access.mockRejectedValueOnce(new TenantAuthError(status === 401 ? 'Unauthorized' : 'Forbidden', status))
    expect((await products.POST(request())).status).toBe(status)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('rejects inactive employees', async () => {
    mocks.staff = false
    expect((await products.POST(request())).status).toBe(403)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('does not permit a category from another tenant or an inactive category', async () => {
    mocks.category = false
    expect((await products.POST(request())).status).toBe(400)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('returns the original product on a retry without updating or deleting anything', async () => {
    expect((await products.POST(request())).status).toBe(201)
    mocks.conflict = true
    const response = await products.POST(request())
    expect(response.status).toBe(200)
    expect((await response.json()).item.id).toBe(requestId)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('does not overwrite another existing product by resending its ID with new data', async () => {
    mocks.conflict = true
    mocks.stored = { id: requestId, name: 'Original', price: 1, category_id: categoryId, show_in_store: false }
    expect((await products.POST(request())).status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('does not report failed creation or delete a saved product if inventory times out', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.inventory.mockRejectedValueOnce(new Error('timeout'))
    const response = await products.POST(request())
    expect(response.status).toBe(201)
    expect((await response.json()).warning).toContain('Producto guardado')
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('does not expose editing or deletion through the new endpoint', () => {
    expect('PATCH' in products).toBe(false)
    expect('DELETE' in products).toBe(false)
    expect('PUT' in products).toBe(false)
  })

  it.each(['PATCH', 'DELETE'])('does not let the cashier use the legacy %s product route either', async method => {
    mocks.access.mockImplementationOnce(async (_tenant, options) => {
      if (!options.staffRoles.includes('cajero')) throw new TenantAuthError('Forbidden', 403)
      return { type: 'staff', role: 'cajero' }
    })
    const req = new NextRequest('http://localhost/api/products/product-1', {
      method, ...(method === 'PATCH' ? { body: JSON.stringify({ price: 1 }) } : {}),
    })
    const response = await (method === 'PATCH' ? PATCH : DELETE)(req, { params: Promise.resolve({ id: requestId }) })
    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it.each(['PATCH', 'DELETE'])('preserves legacy %s access for the verified owner', async method => {
    mocks.access.mockResolvedValueOnce({ type: 'owner', userId: 'owner-1' })
    const req = new NextRequest('http://localhost/api/products/product-1', {
      method, ...(method === 'PATCH' ? { body: JSON.stringify({ price: 1 }) } : {}),
    })
    const response = await (method === 'PATCH' ? PATCH : DELETE)(req, { params: Promise.resolve({ id: requestId }) })
    expect(response.status).toBe(200)
    expect(mocks.filters).toHaveBeenCalledWith('tenant_id', tenantId)
  })

  it.each([0, -1, true, null, '', '1e3', 'NaN', '2,555', 1.234, 1000000])('rejects an invalid price: %s', price => {
    expect(posProductInput.safeParse({ ...payload, price }).success).toBe(false)
  })

  it('normalizes decimal commas, trims names and rejects extra mutable fields', () => {
    expect(posProductInput.parse({ ...payload, name: '  Cafe nuevo  ', price: '3,50' }).price).toBe(3.5)
    expect(posProductInput.safeParse({ ...payload, available: false }).success).toBe(false)
    expect(posProductInput.safeParse({ ...payload, name: '   ' }).success).toBe(false)
  })
})
