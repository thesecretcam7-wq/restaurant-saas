export type OrderTotalsInput = {
  items: Array<{
    price: number
    qty?: number
    quantity?: number
  }>
  taxRate?: number | null
  taxIncluded?: boolean | null
  country?: string | null
  deliveryType?: string | null
  deliveryFee?: number | null
  discount?: number | null
}

export type OrderTotals = {
  subtotal: number
  discount: number
  taxableSubtotal: number
  tax: number
  taxRate: number
  taxIncluded: boolean
  deliveryFee: number
  total: number
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function isTaxIncludedCountry(country?: string | null) {
  return String(country || '').trim().toUpperCase() === 'ES'
}

export function calculateTaxAmount(amount: number, taxRate?: number | null, taxIncluded = false) {
  const base = Math.max(Number(amount) || 0, 0)
  const rate = Math.max(Number(taxRate) || 0, 0)
  if (rate <= 0 || base <= 0) return 0
  return roundMoney(taxIncluded ? base - base / (1 + rate / 100) : base * (rate / 100))
}

export function calculateOrderTotals({
  items,
  taxRate = 0,
  taxIncluded,
  country,
  deliveryType,
  deliveryFee = 0,
  discount = 0,
}: OrderTotalsInput): OrderTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => {
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))
      return sum + (Number(item.price) || 0) * qty
    }, 0)
  )

  const normalizedDiscount = roundMoney(Math.min(Math.max(Number(discount) || 0, 0), subtotal))
  const taxableSubtotal = roundMoney(Math.max(subtotal - normalizedDiscount, 0))
  const normalizedTaxRate = Math.max(Number(taxRate) || 0, 0)
  const normalizedTaxIncluded = taxIncluded ?? isTaxIncludedCountry(country)
  const tax = calculateTaxAmount(taxableSubtotal, normalizedTaxRate, normalizedTaxIncluded)
  const normalizedDeliveryFee = deliveryType === 'delivery' ? roundMoney(Number(deliveryFee) || 0) : 0
  const total = roundMoney(taxableSubtotal + (normalizedTaxIncluded ? 0 : tax) + normalizedDeliveryFee)

  return {
    subtotal,
    discount: normalizedDiscount,
    taxableSubtotal,
    tax,
    taxRate: normalizedTaxRate,
    taxIncluded: normalizedTaxIncluded,
    deliveryFee: normalizedDeliveryFee,
    total,
  }
}
