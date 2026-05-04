import { createServiceClient } from '@/lib/supabase/server'
import { getTenantPlanInfo } from '@/lib/checkPlan'
import { getTenantIdFromSlug } from '@/lib/tenant'
import type { Order } from '@/lib/types'
import UpgradeGate from '@/components/admin/UpgradeGate'
import { BarChart3, PackageOpen, ReceiptText, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function VentasPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  const supabase = createServiceClient()
  const planInfo = await getTenantPlanInfo(tenantId)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [allOrdersRes, monthOrdersRes, lastMonthRes, weekOrdersRes, topItemsRes] = await Promise.all([
    supabase.from('orders').select('id, order_number, total, payment_status, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('orders').select('total, status').eq('tenant_id', tenantId).gte('created_at', startOfMonth),
    supabase.from('orders').select('total, status').eq('tenant_id', tenantId).gte('created_at', startOfLastMonth).lt('created_at', startOfMonth),
    supabase.from('orders').select('total, status').eq('tenant_id', tenantId).gte('created_at', startOf7Days),
    supabase.from('orders').select('items, status').eq('tenant_id', tenantId).gte('created_at', startOfMonth),
  ])

  const allOrders = allOrdersRes.data || []
  const monthOrders = monthOrdersRes.data || []
  const lastMonthOrders = lastMonthRes.data || []
  const weekOrders = weekOrdersRes.data || []
  const isCountableOrder = (order: { status?: string | null }) => order.status !== 'cancelled'
  const allCountableOrders = allOrders.filter(isCountableOrder)
  const monthRevenue = monthOrders.filter(isCountableOrder).reduce((s, o) => s + Number(o.total), 0)
  const lastMonthRevenue = lastMonthOrders.filter(isCountableOrder).reduce((s, o) => s + Number(o.total), 0)
  const weekRevenue = weekOrders.filter(isCountableOrder).reduce((s, o) => s + Number(o.total), 0)
  const totalRevenue = allCountableOrders.reduce((s, o) => s + Number(o.total), 0)
  const monthCount = monthOrders.filter(isCountableOrder).length
  const weekCount = weekOrders.filter(isCountableOrder).length
  const avgTicket = monthCount > 0 ? monthRevenue / monthCount : 0
  const growthPct = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : null

  const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const order of (topItemsRes.data as (Pick<Order, 'items'> & { status?: string | null })[]) || []) {
    if (!isCountableOrder(order)) continue
    for (const item of order.items || []) {
      const productKey = item.item_id || (item as any).menu_item_id || item.name
      const qty = item.qty ?? (item as any).quantity ?? 1
      if (!productCounts[productKey]) productCounts[productKey] = { name: item.name, qty: 0, revenue: 0 }
      productCounts[productKey].qty += qty
      productCounts[productKey].revenue += item.price * qty
    }
  }
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5)
  const formatChartMoney = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
    if (value >= 1000) return `$${Math.round(value / 1000)}k`
    return `$${value.toLocaleString('es-CO')}`
  }

  const dayLabels: string[] = []
  const dayRevenue: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dayLabels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }))
    dayRevenue.push(allOrders
        .filter(o => new Date(o.created_at).toDateString() === d.toDateString() && isCountableOrder(o))
      .reduce((s, o) => s + Number(o.total), 0))
  }
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

      {allCountableOrders.length > 0 && monthCount === 0 && (
        <div className="admin-panel mb-5 flex flex-col gap-2 border-amber-200 bg-amber-50/80 p-4 text-amber-900 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-black">Hay ventas registradas, pero ninguna cae dentro del mes actual.</p>
          <p className="text-xs font-bold">Historico: {allCountableOrders.length} pedidos - ${totalRevenue.toLocaleString('es-CO')}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Ingresos del mes', value: `$${monthRevenue.toLocaleString('es-CO')}`, icon: Wallet, helper: growthPct === null ? 'Sin comparativo' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}% vs mes anterior` },
          { label: 'Pedidos del mes', value: monthCount.toLocaleString('es-CO'), icon: ShoppingBag, helper: 'Pedidos no cancelados' },
          { label: 'Ticket promedio', value: `$${avgTicket.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, icon: ReceiptText, helper: 'Ingreso medio por pedido' },
          { label: 'Ultimos 7 dias', value: `$${weekRevenue.toLocaleString('es-CO')}`, icon: TrendingUp, helper: `${weekCount} pedidos` },
          { label: 'Ventas registradas', value: `$${totalRevenue.toLocaleString('es-CO')}`, icon: BarChart3, helper: `${allCountableOrders.length} pedidos en historial` },
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
                <p className="h-4 text-[11px] font-black text-black/42">{rev > 0 ? formatChartMoney(rev) : ''}</p>
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
                      <p className="text-xs font-black text-black/54">{product.qty} uds.</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/8">
                      <div className="h-full rounded-full bg-[#15130f]" style={{ width: `${(product.qty / topProducts[0].qty) * 100}%` }} />
                    </div>
                  </div>
                  <p className="w-24 text-right text-xs font-black text-[#e43d30]">${product.revenue.toLocaleString('es-CO')}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="font-black text-[#15130f]">Historial de pedidos</h2>
          <p className="text-xs font-semibold text-black/45">Ultimas 20 transacciones</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/50">
              <tr>
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Pedido</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/8">
              {allOrders.slice(0, 20).map((order: any) => (
                <tr key={order.id} className="transition hover:bg-white/70">
                  <td className="px-5 py-3 text-xs font-bold text-black/42">{new Date(order.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</td>
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
                  <td className="px-5 py-3 text-right font-black text-[#15130f]">${Number(order.total).toLocaleString('es-CO')}</td>
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
