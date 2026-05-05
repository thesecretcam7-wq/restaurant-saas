'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Order } from '@/lib/types'

interface Props { params: Promise<{ domain: string }> }

const STATUS: Record<string, { label: string; bg: string; dot: string; icon: string }> = {
  pending:    { label: 'Pendiente',    bg: '#FEF3C7', dot: '#F59E0B', icon: '⏳' },
  confirmed:  { label: 'Confirmado',   bg: 'color-mix(in srgb, var(--primary-color, #E4002B) 12%, white)', dot: 'var(--primary-color, #E4002B)', icon: '✅' },
  preparing:  { label: 'Preparando',   bg: '#FEE2E2', dot: '#EF4444', icon: '👨‍🍳' },
  on_the_way: { label: 'En camino',    bg: '#EDE9FE', dot: '#8B5CF6', icon: '🚗' },
  delivered:  { label: 'Entregado',    bg: '#D1FAE5', dot: '#10B981', icon: '🎉' },
  cancelled:  { label: 'Cancelado',    bg: '#F1F5F9', dot: '#94A3B8', icon: '✕' },
}

const STEPS = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']
const STEP_LABELS = ['Recibido', 'Confirmado', 'Preparando', 'En camino', 'Entregado']

export default function MisPedidosPage({ params }: Props) {
  const { domain: tenantSlug } = use(params)
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activePhoneRef = useRef<string>('')

  const primary = 'var(--primary-color, #E4002B)'

  async function fetchOrders(tel: string, silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/orders/track?tenantId=${tenantSlug}&phone=${encodeURIComponent(tel.trim())}`)
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      if (!silent) setOrders([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Poll every 8 s while results are visible (silent refresh)
  useEffect(() => {
    if (!searched || !activePhoneRef.current) return
    pollingRef.current = setInterval(() => {
      fetchOrders(activePhoneRef.current, true)
    }, 8000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [searched, tenantSlug])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    activePhoneRef.current = phone
    setSearched(true)
    if (pollingRef.current) clearInterval(pollingRef.current)
    await fetchOrders(phone)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/${tenantSlug}`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="font-extrabold text-gray-900">Mis Pedidos</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Search card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color, #E4002B) 12%, white)', color: primary }}>
              📋
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-sm">Buscar mis pedidos</p>
              <p className="text-xs text-muted-foreground">Ingresa el teléfono con el que pediste</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: 3001234567"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: primary }}
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && !loading && orders !== null && (
          orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <div className="text-5xl mb-3">📦</div>
              <p className="font-bold text-gray-900 mb-1">Sin pedidos encontrados</p>
              <p className="text-sm text-muted-foreground">Verifica que el número sea el mismo que usaste</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const st = STATUS[order.status] || STATUS['pending']
                const currentStep = STEPS.indexOf(order.status)
                const isCancelled = order.status === 'cancelled'

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div>
                        <p className="font-extrabold text-gray-900 font-mono text-sm">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: st.bg, color: st.dot }}>
                        <span>{st.icon}</span> {st.label}
                      </span>
                    </div>

                    {/* Progress steps */}
                    {!isCancelled && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-0">
                          {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center flex-1 last:flex-none">
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full transition-all"
                                  style={{ backgroundColor: i <= currentStep ? 'var(--primary-color, #E4002B)' : '#E2E8F0' }}
                                />
                                <span className="text-[8px] text-muted-foreground font-medium whitespace-nowrap">{STEP_LABELS[i]}</span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className="flex-1 h-0.5 mb-3 mx-0.5 transition-all" style={{ backgroundColor: i < currentStep ? 'var(--primary-color, #E4002B)' : '#E2E8F0' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="px-4 pb-3 border-t border-gray-50 pt-3 space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-600">
                          <span>{item.qty}× {item.name}</span>
                          <span className="font-medium">${(item.price * item.qty).toLocaleString('es-CO')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-600">Total pagado</span>
                      <span className="font-extrabold text-base" style={{ color: primary }}>${Number(order.total).toLocaleString('es-CO')}</span>
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

