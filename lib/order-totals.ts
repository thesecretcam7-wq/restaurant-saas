export type OrderTotalsInput = {
  items: Array<{
    price: number
    qty?: number
    quantity?: number
  }>
  taxRate?: number | null
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
  deliveryFee: number
  total: number
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function calculateOrderTotals({
  items,
  taxRate = 0,
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
  const tax = roundMoney(taxableSubtotal * (normalizedTaxRate / 100))
  const normalizedDeliveryFee = deliveryType === 'delivery' ? roundMoney(Number(deliveryFee) || 0) : 0
  const total = roundMoney(taxableSubtotal + tax + normalizedDeliveryFee)

  return {
    subtotal,
    discount: normalizedDiscount,
    taxableSubtotal,
    tax,
    taxRate: normalizedTaxRate,
    deliveryFee: normalizedDeliveryFee,
    total,
  }
}
