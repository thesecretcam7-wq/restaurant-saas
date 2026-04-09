import { createServiceClient } from '@/lib/supabase/server'
import { getTenantPlanInfo } from '@/lib/checkPlan'
import { getTenantIdFromSlug } from '@/lib/tenant'
import UpgradeGate from '@/components/admin/UpgradeGate'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function VentasPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }
  const supabase = createServiceClient()
  const planInfo = await getTenantPlanInfo(tenantId)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [allOrdersRes, monthOrdersRes, lastMonthRes, weekOrdersRes, topItemsRes] = await Promise.all([
    supabase.from('orders').select('total, payment_status, status, created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(500),
    supabase.from('orders').select('total, status').eq('tenant_id', tenantId).gte('created_at', startOfMonth),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).gte('created_at', startOfLastMonth).lt('created_at', startOfMonth).eq('payment_status', 'paid'),
    supabase.from('orders').select('total, status').eq('tenant_id', tenantId).gte('created_at', startOf7Days),
    supabase.from('orders').select('items').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfMonth),
  ])

  const allOrders = allOrdersRes.data || []
  const monthOrders = monthOrdersRes.data || []
  const lastMonthOrders = lastMonthRes.data || []
  const weekOrders = weekOrdersRes.data || []

  const monthRevenue = monthOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)
  const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + Number(o.total), 0)
  const weekRevenue = weekOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)
  const monthCount = monthOrders.filter(o => o.status !== 'cancelled').length
  const weekCount = weekOrders.filter(o => o.status !== 'cancelled').length
  const avgTicket = monthCount > 0 ? monthRevenue / monthCount : 0
  const growthPct = lastMonthRevenue > 0 ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : null

  // Top products from items JSONB
  const productCounts: Record<string, { name: string; qty: number; revenue: number }> = {}
  for (const order of topItemsRes.data || []) {
    for (const item of (order.items as any[]) || []) {
      if (!productCounts[item.item_id]) productCounts[item.item_id] = { name: item.name, qty: 0, revenue: 0 }
      productCounts[item.item_id].qty += item.qty
      productCounts[item.item_id].revenue += item.price * item.qty
    }
  }
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5)

  // Orders by day (last 7 days)
  const dayLabels: string[] = []
  const dayRevenue: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const label = d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
    dayLabels.push(label)
    const dayTotal = allOrders
      .filter(o => {
        const od = new Date(o.created_at)
        return od.toDateString() === d.toDateString() && o.status !== 'cancelled'
      })
      .reduce((s, o) => s + Number(o.total), 0)
    dayRevenue.push(dayTotal)
  }

  const maxDay = Math.max(...dayRevenue, 1)

  const analyticsContent = (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen y analíticas de tu negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Ingresos este mes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${monthRevenue.toLocaleString('es-CO')}</p>
          {growthPct !== null && (
            <p className={`text-xs mt-1 font-medium ${Number(growthPct) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {Number(growthPct) >= 0 ? '▲' : '▼'} {Math.abs(Number(growthPct))}% vs mes anterior
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Pedidos este mes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{monthCount}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Ticket promedio</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${avgTicket.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Últimos 7 días</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${weekRevenue.toLocaleString('es-CO')}</p>
          <p className="text-xs text-gray-400 mt-1">{weekCount} pedidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart últimos 7 días */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Ingresos últimos 7 días</h2>
          <div className="flex items-end gap-2 h-40">
            {dayRevenue.map((rev, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs text-gray-500 font-medium">{rev > 0 ? `$${Math.round(rev / 1000)}k` : ''}</p>
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all"
                  style={{ height: `${Math.max((rev / maxDay) * 120, rev > 0 ? 4 : 0)}px` }}
                />
                <p className="text-xs text-gray-400 text-center leading-tight">{dayLabels[i]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Productos más vendidos (este mes)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos aún</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{p.qty} uds.</p>
                    <p className="text-xs text-gray-400">${p.revenue.toLocaleString('es-CO')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos pedidos */}
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Historial de pedidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2 pr-4">Pedido</th>
                  <th className="pb-2 pr-4">Estado</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allOrders.slice(0, 20).map((o: any) => (
                  <tr key={o.id || Math.random()} className="text-gray-700">
                    <td className="py-2 pr-4 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-gray-600">{o.order_number || '—'}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        o.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {o.status === 'delivered' ? 'Entregado' : o.status === 'cancelled' ? 'Cancelado' : 'En proceso'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">${Number(o.total).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Analíticas de ventas"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      {analyticsContent}
    </UpgradeGate>
  )
}
