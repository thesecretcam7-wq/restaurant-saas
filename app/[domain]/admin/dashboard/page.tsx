import { getTenantBySlugOrId } from '@/lib/getTenant'
import { getTenantPlanInfo, getMonthlyOrderCount } from '@/lib/checkPlan'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface DashboardProps {
  params: Promise<{ domain: string }>
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { domain: slugOrId } = await params
  const tenant = await getTenantBySlugOrId(slugOrId)

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">Restaurante no encontrado</p>
          <p className="text-gray-500 mt-2">No pudimos encontrar ese restaurante</p>
        </div>
      </div>
    )
  }

  const tenantId = tenant.id
  const supabase = createServiceClient()
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [ordersRes, revenueRes, reservationsRes, customersRes, recentOrdersRes, planInfo, monthOrders] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfMonth),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('*').eq('tenant_id', tenantId).eq('delivery_type', 'dine-in').order('created_at', { ascending: false }).limit(20),
    getTenantPlanInfo(tenantId),
    getMonthlyOrderCount(tenantId),
  ])

  const totalOrders = ordersRes.count || 0
  const monthRevenue = (revenueRes.data || []).reduce((sum, o) => sum + Number(o.total), 0)
  const confirmedReservations = reservationsRes.count || 0
  const totalCustomers = customersRes.count || 0
  const recentOrders = recentOrdersRes.data || []

  const orderLimit = planInfo.limits.orders_per_month
  const orderLimitFinite = orderLimit !== Infinity
  const orderPct = orderLimitFinite ? Math.min((monthOrders / orderLimit) * 100, 100) : 0
  const orderLimitWarning = orderLimitFinite && orderPct >= 80

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    on_the_way: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
    on_the_way: 'En camino', delivered: 'Entregado', cancelled: 'Cancelado',
  }


  return (
    <div className="pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de tu restaurante</p>
      </div>

      {/* Quick Access Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/${tenant.slug || tenantId}/admin/kds`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          <span className="text-lg">🍳</span>
          Abrir Kitchen Display System (KDS)
        </Link>
        <Link
          href={`/${tenant.slug || tenantId}/kitchen`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          target="_blank"
        >
          <span className="text-lg">📋</span>
          Abrir Comandero
        </Link>
        <Link
          href={`/${tenant.slug || tenantId}/acceso`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          target="_blank"
        >
          <span className="text-lg">👤</span>
          Acceso de Personal
        </Link>
      </div>

      {/* Plan status banner */}
      <div className={`rounded-xl border p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 ${orderLimitWarning ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-700">Plan {planInfo.label}</span>
            {planInfo.isTrial && planInfo.trialActive && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Prueba gratuita</span>
            )}
            {!planInfo.isActive && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Inactivo</span>
            )}
          </div>
          {orderLimitFinite ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Pedidos este mes</span>
                <span className={`text-xs font-semibold ${orderLimitWarning ? 'text-orange-600' : 'text-gray-600'}`}>
                  {monthOrders} / {orderLimit}
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${orderPct >= 100 ? 'bg-red-500' : orderPct >= 80 ? 'bg-orange-500' : 'bg-blue-500'}`}
                  style={{ width: `${orderPct}%` }}
                />
              </div>
              {orderLimitWarning && (
                <p className="text-xs text-orange-600 mt-1">
                  {orderPct >= 100 ? 'Límite alcanzado. Los nuevos pedidos serán rechazados.' : `Casi en el límite — ${orderLimit - monthOrders} pedidos restantes.`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Pedidos ilimitados este mes</p>
          )}
        </div>
        <Link
          href={`/${tenant.slug || tenantId}/admin/configuracion/planes`}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${orderLimitWarning ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          {orderLimitWarning ? 'Actualizar plan' : 'Ver plan'}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pedidos totales</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ingresos (mes)</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${monthRevenue.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reservas activas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{confirmedReservations}</p>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Clientes</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border flex flex-col h-96">
        <div className="px-5 py-4 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-900">Pedidos Recientes</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-sm">Aún no hay pedidos</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 divide-y pb-4">
            {recentOrders.map(order => (
              <Link
                key={order.id}
                href={`/${tenant.slug || tenantId}/admin/pedidos/${order.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500 truncate">{order.customer_name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <p className="font-semibold text-sm text-gray-900">${Number(order.total).toLocaleString('es-CO')}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
