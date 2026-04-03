import { createServiceClient } from '@/lib/supabase/server'
import { getTenantPlanInfo, getMonthlyOrderCount } from '@/lib/checkPlan'
import Link from 'next/link'

interface DashboardProps {
  params: Promise<{ domain: string }>
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { domain: tenantId } = await params
  const supabase = await createServiceClient()

  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [ordersRes, revenueRes, reservationsRes, customersRes, recentOrdersRes, planInfo, monthOrders] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('total').eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('created_at', startOfMonth),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('orders').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
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

  const navLinks = [
    { href: `/${tenantId}/admin/pedidos`, label: 'Pedidos', icon: '🛍️', desc: 'Ver y gestionar órdenes' },
    { href: `/${tenantId}/admin/productos`, label: 'Productos', icon: '🍽️', desc: 'Gestionar tu menú' },
    { href: `/${tenantId}/admin/reservas`, label: 'Reservas', icon: '📅', desc: 'Calendario de reservas' },
    { href: `/${tenantId}/admin/clientes`, label: 'Clientes', icon: '👥', desc: 'Base de datos de clientes' },
    { href: `/${tenantId}/admin/configuracion/restaurante`, label: 'Configuración', icon: '⚙️', desc: 'Branding, restaurante, planes' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen de tu restaurante</p>
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
          href={`/${tenantId}/admin/configuracion/planes`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Pedidos Recientes</h2>
            <Link href={`/${tenantId}/admin/pedidos`} className="text-sm text-blue-600 hover:underline">Ver todos →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-sm">Aún no hay pedidos</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders.map(order => (
                <Link
                  key={order.id}
                  href={`/${tenantId}/admin/pedidos/${order.id}`}
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

        {/* Quick Access */}
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Acceso Rápido</h2>
          </div>
          <div className="p-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{link.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="p-3 border-t">
            <Link
              href={`/${tenantId}/menu`}
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl">👁️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Ver tienda</p>
                <p className="text-xs text-gray-500">Cómo la ven tus clientes</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
