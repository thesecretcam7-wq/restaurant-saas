import { createServiceClient } from '@/lib/supabase/server'
import { getTenantPlanInfo } from '@/lib/checkPlan'
import { getTenantIdFromSlug } from '@/lib/tenant'
import type { Order } from '@/lib/types'
import UpgradeGate from '@/components/admin/UpgradeGate'
import { BarChart3, PackageOpen, ReceiptText, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import { VoidSaleButton } from '@/components/admin/VoidSaleButton'
import { ReprintReceiptButton } from '@/components/admin/ReprintReceiptButton'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { EditSaleButton } from '@/components/admin/EditSaleButton'
import {
  addRestaurantLocalDays,
  formatRestaurantDateTime,
  getRestaurantLocalDateKey,
  getRestaurantLocalDateStartUtc,
  getRestaurantLocale,
  getRestaurantTimeZone,
} from '@/lib/restaurant-time'

interface Props {
  params: Promise<{ domain: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchOrdersPage(
  supabase: any,
  tenantId: string,
  select: string,
  options: { gte?: string; lt?: string; limit?: number } = {}
) {
  const pageSize = 1000
  const hasLimit = typeof options.limit === 'number'
  const maxRows = hasLimit ? Math.max(options.limit || 0, 0) : Number.POSITIVE_INFINITY
  let from = 0
  let totalCount = 0
  const rows: any[] = []

  while (rows.length < maxRows) {
    let query = supabase
      .from('orders')
      .select(select, { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options.gte) query = query.gte('created_at', options.gte)
    if (options.lt) query = query.lt('created_at', options.lt)

    const to = hasLimit ? Math.min(from + pageSize - 1, maxRows - 1) : from + pageSize - 1
    const { data, error, count } = await query.range(from, to)

    if (error) throw error
    if (from === 0) totalCount = count || 0
    rows.push(...(data || []))

    if (!data || data.length < pageSize || from + pageSize >= totalCount) break
    from += pageSize
  }

  return rows
}

const cancelledSaleStatuses = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'])

function isValidPaidSale(order: { status?: string | null; payment_status?: string | null }) {
  return order.payment_status === 'paid' && !cancelledSaleStatuses.has(String(order.status || '').toLowerCase())
}

function orderTotal(order: { total?: number | string | null }) {
  const parsed = Number(order.total || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export default async function VentasPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  const supabase = createServiceClient()
  const [planInfo, tenantRes, settingsRes] = await Promise.all([
    getTenantPlanInfo(tenantId),
    supabase.from('tenants').select('country').eq('id', tenantId).maybeSingle(),
    supabase.from('restaurant_settings').select('country, timezone, operating_hours').eq('tenant_id', tenantId).maybeSingle(),
  ])
  const restaurantCountry = settingsRes.data?.country || tenantRes.data?.country || 'ES'
  const restaurantLocale = getRestaurantLocale(restaurantCountry)
  const restaurantTimeZone = getRestaurantTimeZone({
    timezone: settingsRes.data?.timezone,
    settingsCountry: settingsRes.data?.country,
    tenantCountry: tenantRes.data?.country,
  })
  const currencyInfo = getCurrencyByCountry(restaurantCountry)
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale)
  const now = new Date()
  const todayKey = getRestaurantLocalDateKey(now, restaurantTimeZone)
  const [localYear, localMonth] = todayKey.split('-').map(Number)
  const monthStartKey = `${localYear.toString().padStart(4, '0')}-${localMonth.toString().padStart(2, '0')}-01`
  const lastMonthDate = new Date(Date.UTC(localYear, localMonth - 2, 1, 12, 0, 0, 0))
  const lastMonthStartKey = [
    lastMonthDate.getUTCFullYear().toString().padStart(4, '0'),
    (lastMonthDate.getUTCMonth() + 1).toString().padStart(2, '0'),
    '01',
  ].join('-')
  const chartDateKeys = Array.from({ length: 7 }, (_, index) => addRestaurantLocalDays(todayKey, index - 6))
  const startOfMonth = getRestaurantLocalDateStartUtc(monthStartKey, restaurantTimeZone)?.toISOString() || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = getRestaurantLocalDateStartUtc(lastMonthStartKey, restaurantTimeZone)?.toISOString() || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const startOf7Days = getRestaurantLocalDateStartUtc(chartDateKeys[0], restaurantTimeZone)?.toISOString() || new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()

  const [allOrders, allHistoryOrders, monthOrders, lastMonthOrders, weekOrders] = await Promise.all([
    fetchOrdersPage(supabase, tenantId, 'id, order_number, total, payment_status, payment_method, status, created_at', { limit: 100 }),
    fetchOrdersPage(supabase, tenantId, 'id, total, status, payment_status, created_at'),
    fetchOrdersPage(supabase, tenantId, 'id, total, status, payment_status, created_at, items', { gte: startOfMonth }),
    fetchOrdersPage(supabase, tenantId, 'id, total, status, payment_status, created_at', { gte: startOfLastMonth, lt: startOfMonth }),
    fetchOrdersPage(supabase, tenantId, 'id, total, status, payment_status, created_at', { gte: startOf7Days }),
  ])

  const allPaidSales = allHistoryOrders.filter(isValidPaidSale)
  const monthPaidSales = monthOrders.filter(isValidPaidSale)
  const lastMonthPaidSales = lastMonthOrders.filter(isValidPaidSale)
  const weekPaidSales = weekOrders.filter(isValidPaidSale)
  const monthRevenue = monthPaidSales.reduce((s, o) => s + orderTotal(o), 0)
  const lastMonthRevenue = lastMonthPaidSales.reduce((s, o) => s + orderTotal(o), 0)
  const weekRevenue = weekPaidSales.reduce((s, o) => s + orderTotal(o), 0)
  const totalRevenue = allPaidSales.reduce((s, o) => s + orderTotal(o), 0)
  const monthCount = monthPaidSales.length
  const weekCount = weekPaidSales.length
  const avgTicket = monthCount > 0 ? monthRevenue / monthCount : 0
  const growthPct = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : null

  const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const order of (monthPaidSales as (Pick<Order, 'items'> & { id?: string | null; status?: string | null; created_at?: string | null })[]) || []) {
    for (const item of order.items || []) {
      const productKey = item.item_id || (item as any).menu_item_id || item.name
      const qty = item.qty ?? (item as any).quantity ?? 1
      if (!productCounts[productKey]) productCounts[productKey] = { name: item.name, qty: 0, revenue: 0 }
      productCounts[productKey].qty += qty
      productCounts[productKey].revenue += item.price * qty
    }
  }
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5)
  const getPaymentLabel = (method?: string | null) => {
    const normalized = String(method || '').toLowerCase()
    if (normalized === 'cash' || normalized === 'efectivo') return 'Efectivo'
    if (['stripe', 'card', 'tarjeta', 'wompi'].includes(normalized)) return 'Tarjeta'
    return method ? String(method) : 'Sin pago'
  }
  const getPaymentBadgeClass = (method?: string | null) => {
    const normalized = String(method || '').toLowerCase()
    if (normalized === 'cash' || normalized === 'efectivo') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (['stripe', 'card', 'tarjeta', 'wompi'].includes(normalized)) return 'border-sky-200 bg-sky-50 text-sky-700'
    return 'border-slate-200 bg-slate-50 text-slate-600'
  }
  const formatChartMoney = (value: number) => {
    if (value >= 1000000) return `${currencyInfo.symbol}${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
    if (value >= 1000) return `${currencyInfo.symbol}${Math.round(value / 1000)}k`
    return `${Math.round(value)}${currencyInfo.symbol}`
  }

  const revenueByLocalDay = new Map(chartDateKeys.map((dateKey) => [dateKey, 0]))
  for (const order of weekPaidSales) {
    const dateKey = getRestaurantLocalDateKey(order.created_at, restaurantTimeZone)
    if (!revenueByLocalDay.has(dateKey)) continue
    revenueByLocalDay.set(dateKey, (revenueByLocalDay.get(dateKey) || 0) + orderTotal(order))
  }
  const dayLabels = chartDateKeys.map((dateKey) => {
    const dayStart = getRestaurantLocalDateStartUtc(dateKey, restaurantTimeZone)
    return formatRestaurantDateTime(dayStart || `${dateKey}T12:00:00Z`, {
      locale: restaurantLocale,
      timeZone: restaurantTimeZone,
      weekday: 'short',
      day: 'numeric',
    })
  })
  const dayRevenue = chartDateKeys.map((dateKey) => revenueByLocalDay.get(dateKey) || 0)
  const maxDay = Math.max(...dayRevenue, 1)

  const analyticsContent = (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Analitica</p>
          <h1 className="admin-title">Ventas</h1>
          <p className="admin-subtitle">Ingresos, ticket promedio, productos top e historial comercial del restaurante.</p>
        </div>
      </div>

      {allPaidSales.length > 0 && monthCount === 0 && (
        <div className="admin-panel mb-5 flex flex-col gap-2 border-amber-200 bg-amber-50/80 p-4 text-amber-900 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-black">Hay ventas registradas, pero ninguna cae dentro del mes actual.</p>
          <p className="text-xs font-bold">Historico: {allPaidSales.length} ventas - {money(totalRevenue)}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Ingresos del mes', value: money(monthRevenue), icon: Wallet, helper: growthPct === null ? 'Sin comparativo' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% vs mes anterior` },
          { label: 'Pedidos del mes', value: monthCount.toLocaleString('es-CO'), icon: ShoppingBag, helper: 'Ventas cobradas no canceladas' },
          { label: 'Ticket promedio', value: money(avgTicket), icon: ReceiptText, helper: 'Ingreso medio por pedido' },
          { label: 'Ultimos 7 dias', value: money(weekRevenue), icon: TrendingUp, helper: `${weekCount} pedidos` },
          { label: 'Ventas registradas', value: money(totalRevenue), icon: BarChart3, helper: `${allPaidSales.length} ventas en historial` },
        ].map(({ label, value, icon: Icon, helper }) => (
          <article key={label} className="admin-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase text-black/42">{label}</p>
              <Icon className="size-5 text-[#e43d30]" />
            </div>
            <p className="mt-5 text-3xl font-black text-[#15130f]">{value}</p>
            <p className="mt-1 text-xs font-bold text-black/42">{helper}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="admin-panel p-5">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-black text-[#15130f]">Ingresos ultimos 7 dias</h2>
              <p className="text-xs font-semibold text-black/45">Vista rapida por dia</p>
            </div>
            <BarChart3 className="size-5 text-[#e43d30]" />
          </div>
          <div className="flex h-48 items-end gap-2">
            {dayRevenue.map((rev, i) => (
              <div key={dayLabels[i]} className="flex flex-1 flex-col items-center gap-2">
                <p className="h-4 whitespace-nowrap text-[10px] font-black leading-none text-black/42 sm:text-[11px]">{rev > 0 ? formatChartMoney(rev) : ''}</p>
                <div className="w-full rounded-t-lg bg-[#e43d30]" style={{ height: `${Math.max((rev / maxDay) * 132, rev > 0 ? 6 : 0)}px` }} />
                <p className="text-center text-[11px] font-bold leading-tight text-black/42">{dayLabels[i]}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel p-5">
          <h2 className="font-black text-[#15130f]">Productos mas vendidos</h2>
          <p className="mt-1 text-xs font-semibold text-black/45">Ranking del mes actual</p>
          {topProducts.length === 0 ? (
            <div className="admin-empty mt-5 min-h-40">
              <PackageOpen className="mb-3 size-7 text-black/24" />
              <p className="font-black text-[#15130f]">Sin datos todavia</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="w-7 text-sm font-black text-black/35">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-[#15130f]">{product.name}</p>
                      <p className="sales-muted shrink-0 text-xs font-black">{product.qty} uds.</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
                      <div className="h-full rounded-full bg-[#15130f]" style={{ width: `${(product.qty / topProducts[0].qty) * 100}%` }} />
                    </div>
                  </div>
                  <p className="w-24 text-right text-xs font-black text-[#e43d30]">{money(product.revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="font-black text-[#15130f]">Historial de pedidos</h2>
          <p className="text-xs font-semibold text-black/45">Ultimas 100 transacciones con hora local del restaurante</p>
        </div>
        <div className="divide-y divide-black/8 md:hidden">
          {allOrders.slice(0, 100).map((order: any) => (
            <article key={order.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-black/45">
                    {formatRestaurantDateTime(order.created_at, {
                      locale: restaurantLocale,
                      timeZone: restaurantTimeZone,
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="mt-1 break-words text-sm font-black leading-5 text-[#15130f]">{order.order_number || 'Sin numero'}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-black text-[#15130f]">{money(Number(order.total))}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                  order.status === 'delivered' ? 'border-green-200 bg-green-50 text-green-700' :
                  order.status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700' :
                  'border-amber-200 bg-amber-50 text-amber-700'
                }`}>
                  {order.status === 'delivered' ? 'Entregado' : order.status === 'cancelled' ? 'Cancelado' : 'En proceso'}
                </span>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getPaymentBadgeClass(order.payment_method)}`}>
                  {getPaymentLabel(order.payment_method)}
                </span>
              </div>
              {order.payment_status === 'paid' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <ReprintReceiptButton tenantId={tenantId} orderId={order.id} orderNumber={order.order_number} />
                  {order.status !== 'cancelled' && (
                    <>
                      <EditSaleButton tenantId={tenantId} orderId={order.id} orderNumber={order.order_number} />
                      <VoidSaleButton orderId={order.id} orderNumber={order.order_number} />
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-white/50">
              <tr>
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Pedido</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Pago</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/8">
              {allOrders.slice(0, 100).map((order: any) => (
                <tr key={order.id} className="transition hover:bg-white/70">
                  <td className="px-5 py-3 text-xs font-bold text-black/42">
                    {formatRestaurantDateTime(order.created_at, {
                      locale: restaurantLocale,
                      timeZone: restaurantTimeZone,
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3 font-black text-[#15130f]">{order.order_number || 'Sin numero'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                      order.status === 'delivered' ? 'border-green-200 bg-green-50 text-green-700' :
                      order.status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700' :
                      'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {order.status === 'delivered' ? 'Entregado' : order.status === 'cancelled' ? 'Cancelado' : 'En proceso'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${getPaymentBadgeClass(order.payment_method)}`}>
                      {getPaymentLabel(order.payment_method)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-black text-[#15130f]">{money(Number(order.total))}</td>
                  <td className="px-5 py-3 text-right">
                    {order.payment_status === 'paid' ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <ReprintReceiptButton tenantId={tenantId} orderId={order.id} orderNumber={order.order_number} />
                        {order.status !== 'cancelled' && (
                          <>
                            <EditSaleButton tenantId={tenantId} orderId={order.id} orderNumber={order.order_number} />
                            <VoidSaleButton orderId={order.id} orderNumber={order.order_number} />
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-black/30">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  return (
    <UpgradeGate tenantId={tenantId} feature="Analiticas de ventas" requiredPlan="pro" currentPlan={planInfo.planId}>
      {analyticsContent}
    </UpgradeGate>
  )
}
