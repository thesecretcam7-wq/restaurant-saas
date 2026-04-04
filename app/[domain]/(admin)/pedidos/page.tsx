'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total: number
  status: string
  payment_status: string
  delivery_type: string
  created_at: string
  items: any[]
}

export default function PedidosPage() {
  const params = useParams()
  const domain = params.domain as string

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing'>('all')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?domain=${domain}&status=${filter === 'all' ? '' : filter}`)
        if (!res.ok) throw new Error('Error fetching orders')
        const data = await res.json()
        setOrders(data.orders || [])
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchOrders()
  }, [domain, filter])

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Pagada</span>
    }
    if (status === 'pending') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Fallida</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-600 mt-1">Gestiona todas las órdenes de tu restaurante</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'confirmed', 'preparing'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status === 'all' && 'Todas'}
            {status === 'pending' && 'Pendientes'}
            {status === 'confirmed' && 'Confirmadas'}
            {status === 'preparing' && 'Preparando'}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando pedidos...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600 text-lg font-medium">No hay pedidos</p>
              <p className="text-slate-500 text-sm">Los pedidos aparecerán aquí cuando los clientes realicen compras</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Pedido</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Pago</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Entrega</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/${domain}/admin/pedidos/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">${order.total.toLocaleString('es-CO')}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 text-sm">{getPaymentBadge(order.payment_status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {order.delivery_type === 'delivery' ? '🚗 Delivery' : '🏪 Recogida'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(order.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/${domain}/admin/pedidos/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
