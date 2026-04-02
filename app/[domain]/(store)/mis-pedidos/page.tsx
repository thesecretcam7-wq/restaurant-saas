'use client'

import { use, useState } from 'react'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pending:    { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  confirmed:  { label: 'Confirmado', color: 'bg-blue-100 text-blue-700',    icon: '✅' },
  preparing:  { label: 'Preparando', color: 'bg-orange-100 text-orange-700', icon: '👨‍🍳' },
  on_the_way: { label: 'En camino',  color: 'bg-indigo-100 text-indigo-700', icon: '🚗' },
  delivered:  { label: 'Entregado',  color: 'bg-green-100 text-green-700',  icon: '🎉' },
  cancelled:  { label: 'Cancelado',  color: 'bg-red-100 text-red-600',      icon: '❌' },
}

export default function MisPedidosPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/orders/track?tenantId=${tenantId}&phone=${encodeURIComponent(phone.trim())}`)
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/${tenantId}/menu`} className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="font-semibold">Mis Pedidos</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Buscar mis pedidos</h2>
          <p className="text-sm text-gray-500 mb-4">Ingresa tu número de teléfono para ver el estado de tus pedidos</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 3001234567"
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </form>
        </div>

        {searched && !loading && orders !== null && (
          orders.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-gray-600 font-medium">No encontramos pedidos</p>
              <p className="text-gray-400 text-sm mt-1">Verifica que el número sea el mismo que usaste al pedir</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => {
                const status = STATUS_INFO[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600', icon: '📦' }
                return (
                  <div key={order.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {order.status !== 'cancelled' && (
                      <div className="flex gap-1 mb-3">
                        {['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered'].map((s, i) => {
                          const steps = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']
                          const currentIdx = steps.indexOf(order.status)
                          return (
                            <div
                              key={s}
                              className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? 'bg-blue-500' : 'bg-gray-200'}`}
                            />
                          )
                        })}
                      </div>
                    )}

                    <div className="space-y-1 text-sm">
                      {(order.items as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-gray-600">
                          <span>{item.qty}× {item.name}</span>
                          <span>${(item.price * item.qty).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between font-semibold text-gray-900 mt-3 pt-3 border-t">
                      <span>Total</span>
                      <span>${Number(order.total).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </main>
    </div>
  )
}
