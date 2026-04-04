'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface OrderItem {
  id?: string
  name: string
  qty: number
  price: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  items: OrderItem[]
  subtotal: number
  tax: number
  delivery_fee: number
  total: number
  status: string
  payment_status: string
  payment_method: string
  delivery_type: string
  delivery_address: string | null
  notes: string | null
  created_at: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as string
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) throw new Error('Error fetching order')
        const data = await res.json()
        setOrder(data.order)
        setNewStatus(data.order.status)
      } catch (err) {
        console.error('Error fetching order:', err)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) fetchOrder()
  }, [orderId])

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Error updating order')
      const data = await res.json()
      setOrder(data.order)
    } catch (err) {
      alert('Error al actualizar el estado: ' + (err instanceof Error ? err.message : 'Error desconocido'))
      setNewStatus(order?.status || '')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmada' },
      preparing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Preparando' },
      on_the_way: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'En camino' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Entregada' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-slate-600 mb-4">Pedido no encontrado</p>
        <Link href={`/${domain}/admin/pedidos`} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Volver a Pedidos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{order.order_number}</h1>
          <p className="text-slate-600 mt-1">
            {new Date(order.created_at).toLocaleString('es-CO')}
          </p>
        </div>
        <Link href={`/${domain}/admin/pedidos`} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Volver
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Información del Cliente</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Nombre</p>
                <p className="text-slate-900">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Teléfono</p>
                <p className="text-slate-900">{order.customer_phone}</p>
              </div>
              {order.customer_email && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Email</p>
                  <p className="text-slate-900">{order.customer_email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Artículos</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">Cantidad: {item.qty}</p>
                  </div>
                  <p className="font-semibold text-slate-900">${(item.price * item.qty).toLocaleString('es-CO')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Info */}
          {order.delivery_type === 'delivery' && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Entrega</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Dirección</p>
                  <p className="text-slate-900">{order.delivery_address || 'No especificada'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Notas</h2>
              <p className="text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Estado del Pedido</h3>
            <div className="mb-4">{getStatusBadge(order.status)}</div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Cambiar estado</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="preparing">Preparando</option>
                <option value="on_the_way">En camino</option>
                <option value="delivered">Entregada</option>
                <option value="cancelled">Cancelada</option>
              </select>

              {newStatus !== order.status && (
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {updating ? 'Actualizando...' : 'Actualizar'}
                </button>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Pago</h3>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Método</p>
                <p className="text-slate-900 capitalize">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase">Estado</p>
                <p className={`font-semibold ${
                  order.payment_status === 'paid' ? 'text-green-600' :
                  order.payment_status === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {order.payment_status === 'paid' ? 'Pagada' :
                   order.payment_status === 'pending' ? 'Pendiente' :
                   'Fallida'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Resumen</h3>

            <div className="space-y-2 text-sm mb-4 pb-4 border-b border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">${order.subtotal.toLocaleString('es-CO')}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Impuesto</span>
                  <span className="font-medium text-slate-900">${order.tax.toLocaleString('es-CO')}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Envío</span>
                  <span className="font-medium text-slate-900">${order.delivery_fee.toLocaleString('es-CO')}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-lg">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">${order.total.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
