import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromSlug, getTenantContext } from '@/lib/tenant'

interface PedidosProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string }>
}

const getStatusLabels = (primaryColor: string) => {
  // Convert hex to RGB with opacity for soft background
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  return {
    pending:    { label: 'Pendiente',           bg: hexToRgba(primaryColor, 0.15), text: primaryColor },
    confirmed:  { label: 'Confirmado',          bg: hexToRgba(primaryColor, 0.15), text: primaryColor },
    preparing:  { label: 'En preparación',      bg: hexToRgba(primaryColor, 0.15), text: primaryColor },
    ready:      { label: 'Listo para recoger',  bg: hexToRgba(primaryColor, 0.15), text: primaryColor },
    on_the_way: { label: 'En camino',           bg: hexToRgba(primaryColor, 0.15), text: primaryColor },
    delivered:  { label: 'Entregado',           bg: 'rgba(243, 244, 246, 1)', text: '#4b5563' },
    cancelled:  { label: 'Cancelado',           bg: 'rgba(254, 226, 226, 1)', text: '#dc2626' },
  }
}

export default async function PedidosPage({ params, searchParams }: PedidosProps) {
  const { domain: slug } = await params
  const { status } = await searchParams
  const supabase = createServiceClient()

  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }

  // Get tenant branding
  const context = await getTenantContext(tenantId)
  const primaryColor = context.branding?.primary_color || '#E4002B'
  const STATUS_LABELS = getStatusLabels(primaryColor)

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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{orders?.length || 0} pedidos encontrados</p>
        </div>
        <a
          href={`/${slug}/pantalla`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
          style={{ backgroundColor: primaryColor, opacity: 0.9 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.9' }}
        >
          📺 Abrir Pantalla
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(f => (
          <a
            key={f.key}
            href={f.key ? `?status=${f.key}` : '?'}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={
              (status || '') === f.key
                ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor }
                : { backgroundColor: 'white', color: '#4b5563', borderColor: '#e5e7eb' }
            }
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
              const statusInfo = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || { label: order.status, bg: 'rgba(243, 244, 246, 1)', text: '#6b7280' }
              return (
                <a
                  key={order.id}
                  href={`/${slug}/admin/pedidos/${order.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{order.order_number}</p>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                      >
                        {statusInfo.label}
                      </span>
                      {order.delivery_type === 'delivery' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">🚗 A domicilio</span>
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
