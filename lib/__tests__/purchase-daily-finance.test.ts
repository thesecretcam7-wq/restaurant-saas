import { describe, expect, it } from 'vitest'
import { buildPurchaseDailyFinance } from '../purchase-daily-finance'

describe('buildPurchaseDailyFinance', () => {
  it('keeps open tills out of available cash and deducts each bill only once', () => {
    const result = buildPurchaseDailyFinance({
      timeZone: 'Europe/Madrid', monthStartKey: '2026-10-01', todayKey: '2026-10-03',
      closedOrderIds: new Set(['closed', 'mixed']),
      orders: [
        { id: 'closed', total: 100, payment_method: 'cash', created_at: '2026-10-01T10:00:00Z' },
        { id: 'old-open', total: 40, payment_method: 'cash', created_at: '2026-10-01T11:00:00Z' },
        { id: 'mixed', total: 200, created_at: '2026-10-03T10:00:00Z', payment_breakdown: [{ method: 'cash', amount: 50 }, { method: 'card', amount: 150 }] },
        { id: 'open', total: 80, payment_method: 'cash', created_at: '2026-10-03T11:00:00Z' },
      ],
      billPayments: [
        { amount: 20, payment_method: 'cash', cash_closing_id: 'closing', paid_at: '2026-10-01T12:00:00Z' },
        { amount: 10, payment_method: 'cash', paid_at: '2026-10-03T12:00:00Z' },
        { amount: 30, payment_method: 'external', paid_at: '2026-10-03T12:00:00Z' },
      ],
    })
    expect(result[0]).toMatchObject({ settledAvailableCash: 80, pendingCash: 40, runningSettledAvailableCash: 80 })
    expect(result[1]).toMatchObject({ settledAvailableCash: 0, pendingCash: 0, runningSettledAvailableCash: 80 })
    expect(result[2]).toMatchObject({ settledAvailableCash: 20, pendingCash: 70, runningSettledAvailableCash: 100, cardSales: 150 })
    for (const day of result) expect(day.settledAvailableCash + day.pendingCash).toBeCloseTo(day.availableCash)
  })

  it('moves net cash to available only after closing, including a negative balance', () => {
    const input = {
      timeZone: 'Europe/Madrid', monthStartKey: '2026-10-01', todayKey: '2026-10-01',
      orders: [{ id: 'sale', total: 25, payment_method: 'cash', created_at: '2026-09-30T22:30:00Z' }],
      billPayments: [
        { amount: 40, payment_method: 'cash', paid_at: '2026-10-01T10:00:00Z', cash_closing_id: null as string | null },
        { amount: 5, payment_method: 'external', paid_at: '2026-10-01T10:00:00Z', cash_closing_id: null as string | null },
      ],
    }
    expect(buildPurchaseDailyFinance(input)[0]).toMatchObject({ settledAvailableCash: -5, pendingCash: -15 })
    input.billPayments[0].cash_closing_id = 'closing'
    expect(buildPurchaseDailyFinance({ ...input, closedOrderIds: new Set(['sale']) })[0])
      .toMatchObject({ settledAvailableCash: -20, pendingCash: 0 })
  })

  it('does not carry previous-month sales or payments into the new month', () => {
    const result = buildPurchaseDailyFinance({
      timeZone: 'Europe/Madrid', monthStartKey: '2026-10-01', todayKey: '2026-10-01',
      closedOrderIds: new Set(['old']),
      orders: [{ id: 'old', total: 100, payment_method: 'cash', created_at: '2026-09-30T20:00:00Z' }],
      billPayments: [{ amount: 20, payment_method: 'external', paid_at: '2026-09-30T20:00:00Z' }],
    })
    expect(result[0]).toMatchObject({ settledAvailableCash: 0, pendingCash: 0, runningSettledAvailableCash: 0 })
  })
  it('separates daily sales and bill payments while keeping a running balance', () => {
    const result = buildPurchaseDailyFinance({
      timeZone: 'Europe/Madrid',
      monthStartKey: '2026-09-01',
      todayKey: '2026-09-03',
      orders: [
        {
          total: 100,
          created_at: '2026-09-01T08:00:00.000Z',
          payment_method: 'cash',
        },
        {
          total: 200,
          created_at: '2026-09-02T08:00:00.000Z',
          payment_method: 'mixed',
          payment_breakdown: [
            { method: 'cash', amount: 50 },
            { method: 'card', amount: 150 },
          ],
        },
      ],
      billPayments: [
        { amount: 20, paid_at: '2026-09-01T09:00:00.000Z', payment_method: 'cash' },
        { amount: 70, paid_at: '2026-09-02T09:00:00.000Z', payment_method: 'external' },
      ],
    })

    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      date: '2026-09-01',
      orders: 1,
      salesTotal: 100,
      cashSales: 100,
      billPaymentsTotal: 20,
      billPaymentsCash: 20,
      netTotal: 80,
      netCash: 80,
      availableCash: 80,
      runningAvailableCash: 80,
      runningNetTotal: 80,
    })
    expect(result[1]).toMatchObject({
      date: '2026-09-02',
      orders: 1,
      salesTotal: 200,
      cashSales: 50,
      cardSales: 150,
      billPaymentsTotal: 70,
      billPaymentsExternal: 70,
      netTotal: 130,
      netCash: 50,
      availableCash: -20,
      runningAvailableCash: 60,
      runningNetTotal: 210,
    })
    expect(result[2]).toMatchObject({
      date: '2026-09-03',
      orders: 0,
      billPaymentsCount: 0,
      availableCash: 0,
      runningAvailableCash: 60,
      runningNetTotal: 210,
    })
  })

  it('uses the restaurant timezone at day boundaries', () => {
    const result = buildPurchaseDailyFinance({
      timeZone: 'Europe/Madrid',
      monthStartKey: '2026-09-01',
      todayKey: '2026-09-01',
      orders: [{
        total: 25,
        created_at: '2026-08-31T22:30:00.000Z',
        payment_method: 'cash',
      }],
      billPayments: [],
    })

    expect(result[0]).toMatchObject({ date: '2026-09-01', salesTotal: 25, cashSales: 25 })
  })
})
