'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Order } from '@/lib/types'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'

interface Props { params: Promise<{ domain: string }> }

const STATUS: Record<string, { label: string; bg: string; dot: string; icon: string }> = {
  pending:    { label: 'Pendiente',    bg: 'rgba(212,175,55,.12)', dot: '#D4AF37', icon: '⏳' },
  confirmed:  { label: 'Confirmado',   bg: 'rgba(211,90,55,.14)', dot: '#D35A37', icon: '✅' },
  preparing:  { label: 'Preparando',   bg: 'rgba(211,90,55,.14)', dot: '#D35A37', icon: '👨‍🍳' },
  on_the_way: { label: 'En camino',    bg: 'rgba(212,175,55,.12)', dot: '#D4AF37', icon: '🚗' },
  delivered:  { label: 'Entregado',    bg: 'rgba(16,185,129,.14)', dot: '#34D399', icon: '🎉' },
  cancelled:  { label: 'Cancelado',    bg: 'rgba(139,151,168,.14)', dot: '#8b97a8', icon: '✕' },
}

const STEPS = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']
const STEP_LABELS = ['Recibido', 'Confirmado', 'Preparando', 'En camino', 'Entregado']

export default function MisPedidosPage({ params }: Props) {
  const { domain: tenantSlug } = use(params)
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [currencyInfo, setCurrencyInfo] = useState(() => getCurrencyByCountry('ES'))
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activePhoneRef = useRef<string>('')

  const primary = 'var(--primary-color, #D4AF37)'
  const button = 'var(--button-primary-color, #D35A37)'
  const pageBg = 'var(--brand-background-color, #0B0E14)'
  const surface = 'var(--brand-surface-color, #1A1F2C)'
  const text = 'var(--brand-text-color, #ffffff)'
  const muted = 'var(--brand-muted-color, #8b97a8)'
  const border = 'rgba(212,175,55,.18)'
  const money = (amount: number) => formatPriceWithCurrency(Number(amount || 0), currencyInfo.code, currencyInfo.locale)

  useEffect(() => {
    fetch(`/api/settings/${tenantSlug}`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(settings => {
        if (settings?.country || settings?.country_code) {
          setCurrencyInfo(getCurrencyByCountry(settings.country_code || settings.country))
        }
      })
      .catch(() => {})
  }, [tenantSlug])

  async function fetchOrders(tel: string, silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/orders/track?tenantId=${tenantSlug}&query=${encodeURIComponent(tel.trim())}`)
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
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: text }}>
      <header className="border-b backdrop-blur-xl" style={{ backgroundColor: surface, borderColor: border }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/${tenantSlug}`} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--brand-soft-color, rgba(212,175,55,.10))', color: primary }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <h1 className="font-extrabold" style={{ color: text }}>Mis Pedidos</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Search card */}
        <div className="rounded-2xl border shadow-sm p-5" style={{ backgroundColor: surface, borderColor: border }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--brand-soft-color, rgba(212,175,55,.10))', color: primary }}>
              📋
            </div>
            <div>
              <p className="font-extrabold text-sm" style={{ color: text }}>Buscar mis pedidos</p>
              <p className="text-xs font-semibold" style={{ color: muted }}>Ingresa tu telefono o numero de pedido</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Telefono o pedido"
              className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              style={{ backgroundColor: pageBg, borderColor: border, color: text }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: button, boxShadow: '0 18px 46px rgba(211,90,55,.24)' }}
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && !loading && orders !== null && (
          orders.length === 0 ? (
            <div className="rounded-2xl border shadow-sm p-10 text-center" style={{ backgroundColor: surface, borderColor: border }}>
              <div className="text-5xl mb-3">📦</div>
              <p className="font-bold mb-1" style={{ color: text }}>Sin pedidos encontrados</p>
              <p className="text-sm font-semibold" style={{ color: muted }}>Verifica el telefono o el numero de pedido.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const st = STATUS[order.status] || STATUS['pending']
                const currentStep = STEPS.indexOf(order.status)
                const isCancelled = order.status === 'cancelled'

                return (
                  <div key={order.id} className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: surface, borderColor: border }}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div>
                        <p className="font-extrabold font-mono text-sm" style={{ color: text }}>{order.order_number}</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: muted }}>
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
                                  style={{ backgroundColor: i <= currentStep ? primary : 'rgba(139,151,168,.28)' }}
                                />
                                <span className="text-[8px] font-medium whitespace-nowrap" style={{ color: muted }}>{STEP_LABELS[i]}</span>
                              </div>
                              {i < STEPS.length - 1 && (
                                <div className="flex-1 h-0.5 mb-3 mx-0.5 transition-all" style={{ backgroundColor: i < currentStep ? primary : 'rgba(139,151,168,.28)' }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="px-4 pb-3 border-t pt-3 space-y-1.5" style={{ borderColor: border }}>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm" style={{ color: muted }}>
                          <span>{item.qty}× {item.name}</span>
                          <span className="font-medium">{money(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center px-4 py-3 border-t" style={{ backgroundColor: 'var(--brand-soft-color, rgba(212,175,55,.10))', borderColor: border }}>
                      <span className="text-sm font-bold" style={{ color: muted }}>Total pagado</span>
                      <span className="font-extrabold text-base" style={{ color: primary }}>{money(Number(order.total))}</span>
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

