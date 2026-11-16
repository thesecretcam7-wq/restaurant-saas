export const INVENTORY_UNITS = [
  { value: 'unidad', label: 'Unidades', short: 'ud.' },
  { value: 'kg', label: 'Kilogramos', short: 'kg' },
  { value: 'g', label: 'Gramos', short: 'g' },
  { value: 'l', label: 'Litros', short: 'l' },
  { value: 'ml', label: 'Mililitros', short: 'ml' },
] as const
export type InventoryUnit = typeof INVENTORY_UNITS[number]['value']
export type ManualMovement = 'purchase' | 'adjustment' | 'damage' | 'sale' | 'return'
export interface InventoryItem {
  id: string; product_name: string; current_stock: number; min_stock: number
  max_stock: number; cost_per_unit: number; unit?: string | null; sku?: string | null
  supplier?: string | null; recipe_count?: number
}
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function inventoryNumber(value: unknown, fallback = NaN) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string' && typeof value !== 'number') return NaN
  const text = String(value).trim()
  if (!text) return fallback
  if (!/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return NaN
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? number : NaN
}
export function validQuantity(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 999999999.999
    && Math.abs(value * 1000 - Math.round(value * 1000)) < 0.0001
}
export function normalizeInventoryItem(row: any): InventoryItem {
  return { ...row, current_stock: Number(row.current_stock || 0), min_stock: Number(row.min_stock || 0),
    max_stock: Number(row.max_stock || 0), cost_per_unit: Number(row.cost_per_unit || 0) }
}
export function inventoryStatus(item: InventoryItem) {
  if (!item.unit && !item.current_stock && !item.min_stock && !item.cost_per_unit && !item.recipe_count) return 'setup'
  if (item.current_stock <= 0) return 'empty'
  if (item.current_stock <= item.min_stock) return 'low'
  return 'ok'
}
export function stockAfterMovement(current: number, type: ManualMovement, quantity: number) {
  const value = type === 'adjustment' ? quantity : current + (type === 'sale' || type === 'damage' ? -quantity : quantity)
  return Math.round(value * 1000) / 1000
}
export function reorderQuantity(item: InventoryItem) {
  return Math.max(0, Math.round((Math.max(item.min_stock, item.max_stock) - item.current_stock) * 1000) / 1000)
}
export function unitLabel(unit?: string | null) {
  return INVENTORY_UNITS.find(value => value.value === unit)?.short || (unit || 'sin unidad')
}
export function validateInventoryFields(body: Record<string, unknown>) {
  const product_name = String(body.productName || '').trim()
  const min_stock = inventoryNumber(body.minStock, 0), max_stock = inventoryNumber(body.maxStock, 0)
  const current_stock = inventoryNumber(body.initialStock, 0), cost_per_unit = inventoryNumber(body.costPerUnit, 0)
  const unit = body.unit === undefined || body.unit === null || body.unit === '' ? null : String(body.unit)
  if (!product_name || product_name.length > 160) throw Error('Escribe un nombre de hasta 160 caracteres.')
  if (![min_stock, max_stock, current_stock].every(validQuantity)) throw Error('Usa cantidades positivas o cero, con un máximo de tres decimales.')
  if (max_stock > 0 && max_stock < min_stock) throw Error('La cantidad deseada debe ser igual o mayor que el mínimo.')
  if (!Number.isFinite(cost_per_unit) || cost_per_unit < 0 || cost_per_unit > 99999999.99) throw Error('Revisa el coste por unidad.')
  if (unit && !INVENTORY_UNITS.some(value => value.value === unit)) throw Error('Selecciona una unidad de medida válida.')
  return { product_name, min_stock, max_stock, current_stock, cost_per_unit, unit,
    sku: String(body.sku || '').trim().slice(0, 80) || null, supplier: String(body.supplier || '').trim().slice(0, 160) || null }
}
