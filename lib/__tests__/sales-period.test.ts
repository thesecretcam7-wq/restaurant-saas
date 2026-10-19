import { describe, expect, it } from 'vitest'
import { salesInPeriod } from '../sales-period'

describe('reusing sales history for period totals', () => {
  const sales = [
    { id: 'before-month', created_at: '2026-08-31T21:59:59.999Z', total: 5 },
    { id: 'month-start', created_at: '2026-09-01T00:00:00+02:00', total: 10 },
    { id: 'last-month-end', created_at: '2026-09-30T23:59:59.999+02:00', total: 20 },
    { id: 'current-month', created_at: '2026-10-01T00:00:00+02:00', total: 30 },
    { id: 'unknown-date', created_at: null, total: 100 },
  ]

  it('matches SQL inclusive start and exclusive end across timezone representations', () => {
    const result = salesInPeriod(sales, '2026-08-31T22:00:00.000Z', '2026-09-30T22:00:00.000Z')
    expect(result.map(sale => sale.id)).toEqual(['month-start', 'last-month-end'])
    expect(result.reduce((total, sale) => total + sale.total, 0)).toBe(30)
  })

  it('can derive a recent period from the same history without losing boundary sales', () => {
    expect(salesInPeriod(sales, '2026-09-30T22:00:00.000Z').map(sale => sale.id)).toEqual(['current-month'])
  })
})
