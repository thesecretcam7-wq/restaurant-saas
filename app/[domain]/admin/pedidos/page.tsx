import { createServiceClient } from '@/lib/supabase/server'
import { getTenantContext, getTenantIdFromSlug } from '@/lib/tenant'
import { ExternalLink, Monitor, PackageOpen, Search, ShoppingBag } from 'lucide-react'

interface PedidosProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string }>
}

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmado', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  preparing: { label: 'Preparando', className: 'border-orange-200 bg-orange-50 text-orange-700' },
  ready: { label: 'Listo', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  on_the_way: { label: 'En camino', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  delivered: { label: 'Entregado', className: 'border-green-200 bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelado', className: 'border-red-200 bg-red-50 text-red-700' },
}

const filters = [
  { key: '', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
]

export default async function PedidosPage({ params, searchParams }: PedidosProps) {
  const { domain: slug } = await params
  const { status } = await searchParams
  const supabase = createServiceClient()
  const tenantId = await getTenantIdFromSlug(slug)

  if (!tenantId) {
    return (
      <div className="admin-empty">
        <PackageOpen className="mb-3 size-8 text-black/24" />
        <p className="font-black text-[#15130f]">Restaurante no encontrado</p>
      </div>
    )
  }

  const context = await getTenantContext(tenantId)
  const restaurantName = context.branding?.app_name || context.tenant?.organization_name || 'Restaurante'

  let query = supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  const { data: orders } = await query
  const activeStatus = status || ''

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Operacion diaria</p>
          <h1 className="admin-title">Pedidos</h1>
          <p className="admin-subtitle">{orders?.length || 0} pedidos encontrados para {restaurantName}.</p>
        </div>
        <a href={`/${slug}/pantalla`} target="_blank" rel="noopener noreferrer" className="admin-button-secondary">
          <Monitor className="size-4" />
          Abrir pantalla
          <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="admin-panel mb-5 p-3">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => {
            const active = activeStatus === filter.key
            return (
              <a
                key={filter.key}
                href={filter.key ? `?status=${filter.key}` : '?'}
                className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                  active ? 'bg-[#15130f] text-white' : 'bg-white/60 text-black/58 hover:bg-white hover:text-[#15130f]'
                }`}
              >
                {filter.label}
              </a>
            )
          })}
        </div>
      </div>

      <section className="admin-panel overflow-hidden">
        {!orders?.length ? (
          <div className="admin-empty m-5">
            <Search className="mb-3 size-8 text-black/24" />
            <p className="font-black text-[#15130f]">No hay pedidos</p>
            <p className="mt-1 text-sm">Cambia el filtro o espera a que entren nuevos pedidos.</p>
          </div>
        ) : (
          <div className="divide-y divide-black/8">
            {orders.map(order => {
              const meta = statusMeta[order.status] || { label: order.status, className: 'border-black/10 bg-black/5 text-black/58' }
              return (
                <a
                  key={order.id}
                  href={`/${slug}/admin/pedidos/${order.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-white/74 lg:grid-cols-[1.1fr_auto_auto_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#15130f] text-white">
                      <ShoppingBag className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#15130f]">{order.order_number || `Pedido ${order.id.slice(0, 8)}`}</p>
                      <p className="truncate text-xs font-semibold text-black/48">{order.customer_name || 'Cliente'} · {order.customer_phone || 'Sin telefono'}</p>
                    </div>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-black ${meta.className}`}>
                    {meta.label}
                  </span>
                  <p className="text-sm font-black text-[#15130f]">${Number(order.total).toLocaleString('es-CO')}</p>
                  <p className="text-xs font-bold text-black/42">
                    {new Date(order.created_at).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </a>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
