import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromSlug } from '@/lib/tenant'

interface PedidosProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-700' },
  confirmed:  { label: 'Confirmado',  color: 'bg-blue-100 text-blue-700' },
  preparing:  { label: 'Preparando',  color: 'bg-orange-100 text-orange-700' },
  on_the_way: { label: 'En camino',   color: 'bg-indigo-100 text-indigo-700' },
  delivered:  { label: 'Entregado',   color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelado',   color: 'bg-red-100 text-red-700' },
}

export default async function PedidosPage({ params, searchParams }: PedidosProps) {
  const { domain: slug } = await params
  const { status } = await searchParams
  const supabase = createServiceClient()

  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }

  let query = supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data: orders } = await query

  const filters = [
    { key: '', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmados' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'delivered', label: 'Entregados' },
    { key: 'cancelled', label: 'Cancelados' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-500 text-sm mt-1">{orders?.length || 0} pedidos encontrados</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <a
            key={f.key}
            href={f.key ? `?status=${f.key}` : '?'}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              (status || '') === f.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border">
        {!orders?.length ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p>No hay pedidos</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map(order => {
              const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <a
                  key={order.id}
                  href={`/${tenantId}/admin/pedidos/${order.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {order.delivery_type === 'delivery' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">🚗 Delivery</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{order.customer_name} • {order.customer_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${Number(order.total).toLocaleString('es-CO')}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
