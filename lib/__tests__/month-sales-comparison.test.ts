import { describe, expect, it } from 'vitest'
import { buildMonthSalesComparison, getMonthComparisonWindow } from '../month-sales-comparison'

const sale = (created_at: string, total: number | string, status = 'completed', payment_status = 'paid') => ({
  created_at, total, status, payment_status,
})

describe('month sales comparison', () => {
  it('compares paid sales through the same local date and time, not the full previous month', () => {
    const result = buildMonthSalesComparison([
      sale('2026-10-01T08:00:00Z', 100), sale('2026-10-19T10:00:00Z', 50),
      sale('2026-09-01T08:00:00Z', 80), sale('2026-09-19T09:00:00Z', 20),
      sale('2026-09-19T11:00:00Z', 200), sale('2026-09-20T08:00:00Z', 300),
      sale('2026-10-19T11:00:00Z', 400),
    ], new Date('2026-10-19T10:00:00Z'), 'Europe/Madrid')
    expect(result).toMatchObject({ currentTotal: 150, previousTotal: 100, difference: 50,
      percentChange: 50, currentOrders: 2, previousOrders: 2, cutoffTime: '12:00:00' })
    expect(result.points).toHaveLength(19)
    expect(result.points.at(-1)).toEqual({ day: 19, current: 150, previous: 100 })
    expect(result.points[1]).toEqual({ day: 2, current: 100, previous: 80 })
  })

  it('ignores unpaid and all cancelled status variants, invalid values and other months', () => {
    const result = buildMonthSalesComparison([
      sale('2026-10-01T08:00:00Z', '10.10'), sale('2026-10-01T08:00:00Z', '0.20'),
      ...['cancelled', 'CANCELED', 'voided', 'deleted', 'anulado', 'cancelado'].map(status => sale('2026-10-01T08:00:00Z', 100, status)),
      sale('2026-10-01T08:00:00Z', 100, 'pending', 'pending'),
      sale('2026-08-01T08:00:00Z', 100), sale('invalid', 100), sale('2026-10-01T08:00:00Z', 'bad'),
    ], new Date('2026-10-19T10:00:00Z'), 'Europe/Madrid')
    expect(result.currentTotal).toBe(10.3)
    expect(result.currentOrders).toBe(2)
    expect(result.percentChange).toBeNull()
  })

  it('returns zero, not an invented percentage, when there are no sales', () => {
    const result = buildMonthSalesComparison([], new Date('2026-10-01T10:00:00Z'), 'Europe/Madrid')
    expect(result).toMatchObject({ currentTotal: 0, previousTotal: 0, difference: 0, percentChange: null })
    expect(result.points).toEqual([{ day: 1, current: 0, previous: 0 }])
  })

  it('shows a fall of 100 percent when only the previous month has sales', () => {
    const result = buildMonthSalesComparison([sale('2026-09-01T08:00:00Z', 50)],
      new Date('2026-10-01T10:00:00Z'), 'Europe/Madrid')
    expect(result).toMatchObject({ difference: -50, percentChange: -100 })
  })

  it('uses local month boundaries and accounts for different DST offsets', () => {
    const result = buildMonthSalesComparison([
      sale('2026-02-28T23:30:00Z', 10), sale('2026-01-31T23:15:00Z', 20),
      sale('2026-01-31T22:59:59Z', 100), sale('2026-02-01T11:30:00Z', 50),
    ], new Date('2026-03-01T11:00:00Z'), 'Europe/Madrid')
    expect(result).toMatchObject({ currentTotal: 10, previousTotal: 20 })
    const dst = buildMonthSalesComparison([
      sale('2026-03-31T10:00:00Z', 10), sale('2026-04-30T09:00:00Z', 20),
    ], new Date('2026-04-30T09:30:00Z'), 'Europe/Madrid')
    expect(dst.previousTotal).toBe(0)
    expect(getMonthComparisonWindow(new Date('2026-04-01T00:00:00Z'), 'Europe/Madrid').previousStart)
      .toBe('2026-02-28T23:00:00.000Z')
  })

  it('includes the full shorter previous month and carries its total without adding fictional days', () => {
    const result = buildMonthSalesComparison([
      sale('2026-02-28T22:30:00Z', 80), sale('2026-03-31T08:00:00Z', 100),
    ], new Date('2026-03-31T09:00:00Z'), 'Europe/Madrid')
    expect(result).toMatchObject({ previousThrough: '2026-02-28', previousTotal: 80, currentTotal: 100 })
    expect(result.points.at(-1)).toEqual({ day: 31, current: 100, previous: 80 })
  })

  it('handles a leap February and the year boundary', () => {
    expect(getMonthComparisonWindow(new Date('2024-03-31T09:00:00Z'), 'Europe/Madrid'))
      .toMatchObject({ previousThrough: '2024-02-29', previousLastDay: 29 })
    expect(getMonthComparisonWindow(new Date('2026-01-19T09:00:00Z'), 'Europe/Madrid'))
      .toMatchObject({ previousThrough: '2025-12-19', previousStart: '2025-11-30T23:00:00.000Z' })
  })
})
