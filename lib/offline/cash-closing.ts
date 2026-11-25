import type { CashClosingStats } from '../cash-closing'
import type { OfflineOrder, POSCashClosingCache } from './storage'
import { getRestaurantBusinessPeriod, getRestaurantLocale } from '../restaurant-time'

export type LocalClosingSales = { count: number; cash: number; card: number; other: number; total: number }
export type OfflineCashClosingPreview = {
  source: 'cached' | 'local'
  cachedAt: string | null
  timeZone: string
  localSales: LocalClosingSales
}
const money = (value: number) => Math.round(value * 100) / 100
export function buildOfflineCashClosing(input: {
  tenantId: string; mode: 'current' | 'pending'; cache: POSCashClosingCache | null; orders: OfflineOrder[]
  timeZone: string; operatingHours?: unknown; country: string; now?: Date
}): { stats: CashClosingStats; preview: OfflineCashClosingPreview } {
  const period = getRestaurantBusinessPeriod({ timeZone: input.timeZone, operatingHours: input.operatingHours, locale: getRestaurantLocale(input.country), now: input.now })
  const cached = input.cache?.tenantId === input.tenantId && input.cache.mode === input.mode ? input.cache : null
  const cacheStart = Date.parse(cached?.stats.periodStart || ''), cacheEnd = Date.parse(cached?.stats.periodEnd || '')
  const dayStart = Date.parse(period.periodStart), dayEnd = Date.parse(period.periodEnd)
  const validCache = cached && Number.isFinite(Date.parse(cached.cachedAt)) && Number.isFinite(cacheStart) && cacheEnd > cacheStart
    && (input.mode === 'current' ? cacheStart >= dayStart && cacheStart < dayEnd && cacheEnd === dayEnd : cacheEnd <= dayStart)
    ? cached : null
  if (input.mode === 'pending' && !validCache) throw Error('No hay una consulta del corte anterior guardada en este TPV. Puedes consultar el corte actual sin conexión.')
  const start = input.mode === 'pending' ? cacheStart : dayStart, end = input.mode === 'pending' ? cacheEnd : dayEnd
  const localSales: LocalClosingSales = { count: 0, cash: 0, card: 0, other: 0, total: 0 }
  const seen = new Set<string>(), closingOrders: CashClosingStats['closingOrders'] = []
  for (const order of input.orders) {
    const at = Date.parse(order.createdAt), total = Number(order.total)
    if (order.tenantId !== input.tenantId || order.source !== 'pos-offline' || order.syncedAt || order.status !== 'completed'
      || !Number.isFinite(at) || at < start || at >= end || !Number.isFinite(total) || total < 0 || seen.has(order.id)) continue
    seen.add(order.id); localSales.count++; localSales.total += total
    if (order.paymentMethod === 'cash') localSales.cash += total
    else if (['stripe', 'card'].includes(order.paymentMethod)) localSales.card += total
    else localSales.other += total
    closingOrders.push({ id: order.id, order_number: order.orderNumber, total, payment_method: order.paymentMethod, created_at: order.createdAt })
  }
  for (const key of ['cash', 'card', 'other', 'total'] as const) localSales[key] = money(localSales[key])
  // Never add a pending local order to a server snapshot: a lost confirmation
  // can leave the same sale in both places. Keep the two sources visibly separate.
  const stats: CashClosingStats = validCache?.stats || {
    ...period, cashSales: localSales.cash, cardSales: localSales.card, otherSales: localSales.other, totalSales: localSales.total,
    transactionCount: localSales.count, ordersCompleted: localSales.count, ordersCancelled: 0,
    billPaymentsTotal: 0, billPaymentsCount: 0, billPayments: [], totalDeliveryFees: 0, deliveryOrderCount: 0, totalTax: 0, totalDiscount: 0, closingOrders,
  }
  return { stats, preview: { source: validCache ? 'cached' : 'local', cachedAt: validCache?.cachedAt || null, timeZone: input.timeZone, localSales } }
}
