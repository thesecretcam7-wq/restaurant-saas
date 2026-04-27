import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromSlug } from '@/lib/tenant'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Order, OrderItem } from '@/lib/types'
import OrderStatusActions from './OrderStatusActions'

interface PedidoDetailProps {
  params: Promise<{ domain: string; id: string }>
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',           color: 'bg-yellow-100 text-yellow-700' },
  confirmed:  { label: 'Confirmado',          color: 'bg-blue-100 text-blue-700' },
  preparing:  { label: 'En preparación',      color: 'bg-orange-100 text-orange-700' },
  ready:      { label: 'Listo para recoger',  color: 'bg-green-100 text-green-700' },
  on_the_way: { label: 'En camino',           color: 'bg-indigo-100 text-indigo-700' },
  delivered:  { label: 'Entregado',           color: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: 'Cancelado',           color: 'bg-red-100 text-red-700' },
}

export default async function PedidoDetailPage({ params }: PedidoDetailProps) {
  const { domain: slug, id } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!order) notFound()

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' }
  const nextStatus = STATUS_FLOW[order.status]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${tenantId}/admin/pedidos`} className="text-gray-500 hover:text-gray-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.created_at).toLocaleString('es-CO')}
          </p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <h2 className="font-semibold mb-3 text-gray-900">Cliente</h2>
        <p className="text-gray-700 font-medium">{order.customer_name}</p>
        {order.customer_phone && <p className="text-sm text-gray-500">{order.customer_phone}</p>}
        {order.customer_email && <p className="text-sm text-gray-500">{order.customer_email}</p>}
        {order.delivery_type === 'delivery' && order.delivery_address && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Dirección de entrega</p>
            <p className="text-sm text-gray-700">{order.delivery_address}</p>
          </div>
        )}
        {order.notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Notas</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border p-5 mb-4">
        <h2 className="font-semibold mb-3 text-gray-900">Productos</h2>
        <div className="space-y-2">
          {order.items.map((item: OrderItem, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.qty}× {item.name}</span>
              <span className="font-medium">${(item.price * item.qty).toLocaleString('es-CO')}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toLocaleString('es-CO')}</span>
          </div>
          {Number(order.tax) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Impuestos</span>
              <span>${Number(order.tax).toLocaleString('es-CO')}</span>
            </div>
          )}
          {Number(order.delivery_fee) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Envío a domicilio</span>
              <span>${Number(order.delivery_fee).toLocaleString('es-CO')}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1 border-t">
            <span>Total</span>
            <span>${Number(order.total).toLocaleString('es-CO')}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {order.payment_status === 'paid' ? '✅ Pagado' : '⏳ Pago pendiente'}
          </span>
          <span className="text-xs text-gray-500">
            {order.payment_method === 'stripe' ? 'Tarjeta' : order.payment_method === 'cash' ? 'Efectivo' : '-'}
          </span>
        </div>
      </div>

      {/* Status actions */}
      <OrderStatusActions
        orderId={order.id}
        tenantId={tenantId}
        currentStatus={order.status}
        nextStatus={nextStatus}
      />
    </div>
  )
}
