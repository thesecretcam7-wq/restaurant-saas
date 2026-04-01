import { createClient } from '@/lib/supabase/server'

interface DashboardProps {
  params: Promise<{ domain: string }>
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { domain: tenantId } = await params
  const supabase = await createClient()

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [ordersToday, ordersMonth, pendingOrders, reservationsToday] = await Promise.all([
    supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfDay),
    supabase
      .from('orders')
      .select('total')
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'paid')
      .gte('created_at', startOfMonth),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'confirmed', 'preparing'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('reservations')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('reservation_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed']),
  ])

  const salesMonth = (ordersMonth.data || []).reduce((sum, o) => sum + Number(o.total), 0)
  const ordersTodayCount = ordersToday.count || 0
  const pendingCount = pendingOrders.count || 0
  const reservationsCount = reservationsToday.count || 0

  const stats = [
    { label: 'Pedidos hoy', value: ordersTodayCount, icon: '🛍️', color: 'bg-blue-50 text-blue-700' },
    { label: 'Ventas del mes', value: `$${salesMonth.toLocaleString('es-CO')}`, icon: '💰', color: 'bg-green-50 text-green-700' },
    { label: 'Pedidos pendientes', value: pendingCount, icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Reservas hoy', value: reservationsCount, icon: '📅', color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending orders */}
      <div className="bg-white rounded-xl border">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Pedidos recientes pendientes</h2>
          <a href={`/${tenantId}/admin/pedidos`} className="text-sm text-blue-600 hover:underline">
            Ver todos →
          </a>
        </div>
        <div className="divide-y">
          {pendingOrders.data?.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">✅</p>
              <p>No hay pedidos pendientes</p>
            </div>
          )}
          {pendingOrders.data?.map(order => (
            <a
              key={order.id}
              href={`/${tenantId}/admin/pedidos/${order.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{order.order_number}</p>
                <p className="text-sm text-gray-500">{order.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${Number(order.total).toLocaleString('es-CO')}</p>
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
