import { describe, expect, it } from 'vitest'
import { calculateOrderTotals } from '../order-totals'

describe('calculateOrderTotals', () => {
  it('keeps Spanish menu prices tax-included', () => {
    const totals = calculateOrderTotals({
      items: [{ price: 1.5, qty: 1 }],
      taxRate: 10,
      country: 'ES',
    })

    expect(totals.subtotal).toBe(1.5)
    expect(totals.tax).toBe(0.14)
    expect(totals.total).toBe(1.5)
    expect(totals.taxIncluded).toBe(true)
  })

  it('keeps additive tax for non-Spanish restaurants', () => {
    const totals = calculateOrderTotals({
      items: [{ price: 1.5, qty: 1 }],
      taxRate: 10,
      country: 'CO',
    })

    expect(totals.subtotal).toBe(1.5)
    expect(totals.tax).toBe(0.15)
    expect(totals.total).toBe(1.65)
    expect(totals.taxIncluded).toBe(false)
  })
})
