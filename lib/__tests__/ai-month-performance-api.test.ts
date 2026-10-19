import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  access: vi.fn(), from: vi.fn(), closing: vi.fn(), ranges: vi.fn(), retries: vi.fn(),
  filters: vi.fn(), rows: [] as Record<string, unknown>[], failPage: false,
}))
vi.mock('@/lib/rate-limit', () => ({ getAiLimiter: () => null }))
vi.mock('@/lib/tenant-api-auth', () => ({
  requireTenantAccess: mocks.access,
  tenantAuthErrorResponse: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
}))
vi.mock('@/lib/supabase/server', () => ({ createServiceClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/cash-closing-server', () => ({ calculatePendingPreviousCashClosingStats: mocks.closing }))

import { GET } from '../../app/api/ai/demand-forecast/route'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-19T10:00:00Z'))
  vi.clearAllMocks()
  mocks.rows = []
  mocks.failPage = false
  mocks.access.mockResolvedValue({ type: 'owner' })
  mocks.closing.mockResolvedValue(null)
  mocks.from.mockImplementation((table: string) => {
    let offset = 0
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(function (this: unknown, key: string, value: unknown) { mocks.filters(key, value); return this }),
      gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(),
      retry: vi.fn(function (this: unknown, enabled: boolean) { mocks.retries(enabled); return this }),
      range: vi.fn(function (this: unknown, start: number, end: number) {
        offset = start; mocks.ranges(start, end); return this
      }),
      then(resolve: (value: unknown) => unknown) {
        const result = table === 'restaurant_settings'
          ? { data: { country: 'ES', timezone: 'Europe/Madrid' }, error: null }
          : mocks.failPage && offset > 0
            ? { data: null, error: new Error('Database timeout') }
            : { data: mocks.rows.slice(offset, offset + 1000), error: null }
        return Promise.resolve(result).then(resolve)
      },
    }
    return query
  })
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

const request = () => new NextRequest('http://localhost/api/ai/demand-forecast?tenantId=restaurant-1')

describe('monthly performance API', () => {
  it('reads beyond 1000 sales and reuses the data for recommendations without a second endpoint', async () => {
    mocks.rows = Array.from({ length: 1005 }, (_, i) => ({
      id: `order-${i}`, total: 1, created_at: '2026-10-01T08:00:00Z', payment_status: 'paid',
      status: 'completed', items: [{ name: 'Cafe', qty: 1, price: 1 }],
    }))
    const response = await GET(request())
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(data.monthComparison.currentTotal).toBe(1005)
    expect(data.recommendations[0]).toMatchObject({ name: 'Cafe', quantity: 1005, revenue: 1005 })
    expect(mocks.ranges.mock.calls).toEqual([[0, 999], [1000, 1999]])
    expect(mocks.filters).toHaveBeenCalledWith('tenant_id', 'restaurant-1')
    expect(mocks.filters).toHaveBeenCalledWith('payment_status', 'paid')
    expect(mocks.retries.mock.calls.every(([enabled]) => enabled === false)).toBe(true)
  })

  it('fails rather than reporting partial totals when a later page cannot load', async () => {
    mocks.rows = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`, total: 1, created_at: '2026-10-01T08:00:00Z', payment_status: 'paid',
    }))
    mocks.failPage = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET(request())
    expect(response.status).toBe(500)
    expect((await response.json()).monthComparison).toBeUndefined()
  })

  it('does not read tenant sales without authorization', async () => {
    mocks.access.mockRejectedValueOnce(new Error('Forbidden'))
    expect((await GET(request())).status).toBe(403)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
