import { describe, expect, it } from 'vitest'
import { buildPurchaseDailyFinance } from '../purchase-daily-finance'

describe('buildPurchaseDailyFinance', () => {
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
      runningNetTotal: 210,
    })
    expect(result[2]).toMatchObject({
      date: '2026-09-03',
      orders: 0,
      billPaymentsCount: 0,
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
