export interface ProductSale {
  key: string
  name: string
  quantity: number
  amount: number
}

interface ProductSalesOrder {
  status?: string | null
  payment_status?: string | null
  items?: unknown
}

const cancelled = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'])
export const normalizeProductSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function isProductSalesDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function summarizeProductSales(orders: ProductSalesOrder[]): ProductSale[] {
  const products = new Map<string, ProductSale>()
  for (const order of orders) {
    if (order.payment_status !== 'paid' || cancelled.has(String(order.status || '').trim().toLowerCase())) continue
    if (!Array.isArray(order.items)) continue
    for (const item of order.items) {
      if (!item || typeof item !== 'object') continue
      const name = String(item.name || '').trim()
      const quantity = Number(item.qty ?? item.quantity ?? 1)
      const price = Number(item.price)
      if (!name || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) continue
      const productId = item.menu_item_id || item.item_id
      const key = productId ? `id:${productId}` : `name:${normalizeProductSearch(name).replace(/\s+/g, ' ')}`
      const product = products.get(key) || { key, name, quantity: 0, amount: 0 }
      product.quantity += quantity
      product.amount += price * quantity
      products.set(key, product)
    }
  }
  return [...products.values()].map(product => ({ ...product, amount: Math.round(product.amount * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'es'))
}
