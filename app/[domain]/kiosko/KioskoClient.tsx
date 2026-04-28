'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuCategory { id: string; name: string; sort_order: number; image_url: string | null }
interface MenuItem {
  id: string; name: string; description: string | null
  price: number; image_url: string | null; available: boolean
  category_id: string | null; featured: boolean
}
interface CartItem { menu_item_id: string; name: string; price: number; qty: number }
type Step = 'menu' | 'cart' | 'checkout' | 'confirmed'

interface Props {
  tenantId: string
  domain: string
  branding: { appName: string; primaryColor: string; logoUrl: string | null }
  categories: MenuCategory[]
  menuItems: MenuItem[]
  taxRate: number
  currencySymbol: string
  stripeEnabled: boolean
  initialConfirmed?: { number: number; name: string }
}

function fmt(amount: number, symbol: string) {
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')}`
}

function pad(n: number) { return String(n).padStart(3, '0') }

function darken(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function lighten(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KioskoClient({
  tenantId, domain, branding, categories, menuItems,
  taxRate, currencySymbol, stripeEnabled, initialConfirmed,
}: Props) {
  const [step, setStep] = useState<Step>(initialConfirmed ? 'confirmed' : 'menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [itemQty, setItemQty] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<{ number: number; name: string } | null>(
    initialConfirmed ?? null
  )
  const [countdown, setCountdown] = useState(12)
  const [time, setTime] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFsPrompt, setShowFsPrompt] = useState(true)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { primaryColor, appName, logoUrl } = branding
  const hoverColor = darken(primaryColor)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      if (fs) setShowFsPrompt(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    setTime(new Date())
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (step !== 'confirmed') return
    setCountdown(12)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { reset(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [step])

  const reset = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCart([])
    setCustomerName('')
    setOrderNotes('')
    setError(null)
    setConfirmed(null)
    setSelectedItem(null)
    setStep('menu')
  }, [])

  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const tax = taxRate ? cartTotal * (taxRate / 100) : 0
  const grandTotal = cartTotal + tax

  const getQtyInCart = (id: string) => cart.find(c => c.menu_item_id === id)?.qty ?? 0

  const addToCart = (item: MenuItem, qty: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id)
      if (existing) return prev.map(c => c.menu_item_id === item.id ? { ...c, qty: c.qty + qty } : c)
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, qty }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.menu_item_id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0))
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.menu_item_id !== id))

  const getCSRF = async (): Promise<string> => {
    const res = await fetch('/api/csrf-token')
    return res.headers.get('x-csrf-token') || ''
  }

  const placeOrderCash = async () => {
    if (!customerName.trim()) { setError('Ingresa tu nombre'); return }
    setLoading(true); setError(null)
    try {
      const csrf = await getCSRF()
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({
          tenantId,
          items: cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, price: c.price, qty: c.qty })),
          customerInfo: { name: customerName.trim(), phone: '', email: '' },
          deliveryType: 'pickup',
          paymentMethod: 'cash',
          notes: orderNotes.trim() || undefined,
          source: 'kiosk',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear el pedido')
      setConfirmed({ number: data.displayNumber ?? 0, name: customerName.trim() })
      setStep('confirmed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  const placeOrderStripe = async () => {
    if (!customerName.trim()) { setError('Ingresa tu nombre'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/kiosko/${domain}/stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({ menu_item_id: c.menu_item_id, name: c.name, price: c.price, qty: c.qty })),
          customerName: customerName.trim(),
          notes: orderNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar pago')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar')
      setLoading(false)
    }
  }

  // ── Clock display (memoized to prevent header flickering) ─────────────────────
  const Clock = memo(({ time }: { time: Date | null }) => (
    <p className="text-2xl font-mono font-bold tabular-nums drop-shadow-lg">
      {time?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}
    </p>
  ))
  Clock.displayName = 'Clock'

  // ── Shared header ───────────────────────────────────────────────────────────
  const AppHeader = ({ backLabel, onBack }: { backLabel?: string; onBack?: () => void }) => (
    <motion.header
      className="flex items-center justify-between px-8 py-5 flex-shrink-0 text-white border-b border-white/10 backdrop-blur-xl"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${lighten(primaryColor, 20)})`,
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <motion.button
            onClick={onBack}
            className="mr-2 bg-white/20 rounded-full p-2.5 hover:bg-white/30 transition-all border border-white/30 backdrop-blur-sm"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </motion.button>
        )}
        {logoUrl && (
          <motion.img
            src={logoUrl}
            alt=""
            className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/40 shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          />
        )}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-2xl font-black leading-tight drop-shadow-lg">{appName}</p>
          {backLabel && <p className="text-xs opacity-80 font-semibold">{backLabel}</p>}
        </motion.div>
      </div>
      <motion.div className="text-right" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <Clock time={time} />
        <p className="text-xs opacity-75 font-semibold capitalize">
          {time?.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) ?? ''}
        </p>
      </motion.div>
    </motion.header>
  )

  // ── Confirmed screen ────────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmed) {
    return (
      <motion.div
        className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            className="text-center w-full max-w-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 100 }}
          >
            {/* Order number display */}
            <motion.div
              className="rounded-3xl p-12 mb-8 shadow-2xl border border-white/10 backdrop-blur-xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${lighten(primaryColor, 30)})`,
              }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.p
                className="text-white/70 text-sm tracking-widest uppercase mb-3 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Tu número de turno
              </motion.p>
              <motion.p
                className="text-[10rem] font-black tabular-nums leading-none text-white drop-shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, duration: 0.6, type: 'spring', stiffness: 80 }}
              >
                {pad(confirmed.number)}
              </motion.p>
            </motion.div>

            {/* Customer info */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <p className="text-3xl font-black text-white mb-3">{confirmed.name}</p>
              <p className="text-gray-300 text-lg mb-10 leading-relaxed">
                Pasa a recoger cuando tu número<br />aparezca en la pantalla de llamadas
              </p>
            </motion.div>

            {/* Countdown bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <div className="mb-4">
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                  <motion.div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: `linear-gradient(90deg, ${primaryColor}, ${lighten(primaryColor, 20)})`,
                      width: `${(countdown / 12) * 100}%`,
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </div>
              <p className="text-gray-400 text-sm font-medium">
                Nuevo pedido en <span className="text-white font-bold">{countdown}s</span>
              </p>
            </motion.div>

            {/* Action button */}
            <motion.button
              onClick={reset}
              className="mt-10 px-10 py-5 rounded-2xl text-white font-black text-lg shadow-xl border border-white/20 transition-all hover:shadow-2xl"
              style={{ backgroundColor: primaryColor }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Hacer otro pedido →
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  // ── Checkout screen ─────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <motion.div
        className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AppHeader backLabel="Volver al carrito" onBack={() => setStep('cart')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto p-6 pb-32">
            <motion.h2
              className="text-3xl font-black text-gray-900 mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Finalizar pedido
            </motion.h2>

            {/* Order summary card */}
            <motion.div
              className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-6 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Resumen del pedido</p>
              <div className="space-y-3 mb-5">
                {cart.map((item, idx) => (
                  <motion.div
                    key={item.menu_item_id}
                    className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + idx * 0.05 }}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.qty}× ${Math.round(item.price).toLocaleString('es-CO')}</p>
                    </div>
                    <p className="font-black text-lg text-gray-900">{fmt(item.price * item.qty, currencySymbol)}</p>
                  </motion.div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t-2 border-gray-100">
                <motion.div
                  className="flex justify-between text-gray-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <span>Subtotal</span>
                  <span className="font-semibold">{fmt(cartTotal, currencySymbol)}</span>
                </motion.div>
                {taxRate > 0 && (
                  <motion.div
                    className="flex justify-between text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    <span>Impuestos ({taxRate}%)</span>
                    <span className="font-semibold">{fmt(tax, currencySymbol)}</span>
                  </motion.div>
                )}
                <motion.div
                  className="flex justify-between pt-2 text-2xl font-black rounded-xl p-3 mt-4"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}15, ${lighten(primaryColor, 50)}15)`,
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-gray-900">Total a pagar</span>
                  <span style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Name input */}
            <motion.div
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block">
                <span className="text-sm font-bold text-gray-700 mb-3 block">
                  Tu nombre <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="¿Cómo te llamamos?"
                  className="w-full border-2 border-gray-200 rounded-xl px-5 py-4 text-gray-900 text-lg placeholder-gray-400 focus:outline-none transition-all focus:border-2"
                  onFocus={(e) => {
                    if (customerName) e.currentTarget.style.borderColor = primaryColor
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                  autoComplete="off"
                />
              </label>
            </motion.div>

            {/* Notes */}
            <motion.div
              className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label className="block">
                <span className="text-sm font-bold text-gray-700 mb-3 block">
                  Instrucciones especiales <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                </span>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Sin cebolla, extra salsa..."
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-5 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none resize-none transition-all"
                />
              </label>
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="bg-red-50 border-2 border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm mb-6 font-medium flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-xl">⚠️</span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment buttons */}
            <motion.div
              className="space-y-3 pb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                onClick={placeOrderCash}
                disabled={loading}
                className="w-full py-5 rounded-2xl text-white font-black text-lg shadow-xl border border-white/30 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
                whileHover={{ scale: loading ? 1 : 1.02, boxShadow: loading ? undefined : `0 12px 24px ${primaryColor}40` }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-xl">🏧</span>
                {loading ? 'Procesando...' : 'Pagar en Caja'}
              </motion.button>

              {stripeEnabled && (
                <motion.button
                  onClick={placeOrderStripe}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-lg shadow-lg border border-slate-700/50 transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">💳</span>
                  Pagar con Tarjeta
                </motion.button>
              )}

              <AnimatePresence>
                {loading && (
                  <motion.div
                    className="flex items-center justify-center gap-2 pt-3 text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: primaryColor }}
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-sm font-medium">Procesando pago...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Cart screen ─────────────────────────────────────────────────────────────
  if (step === 'cart') {
    return (
      <motion.div
        className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AppHeader backLabel="Seguir pidiendo" onBack={() => setStep('menu')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto p-6 pb-40">
            <motion.h2
              className="text-3xl font-black text-gray-900 mb-7"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Tu pedido
            </motion.h2>

            {cart.length === 0 ? (
              <motion.div
                className="text-center py-24 text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.p
                  className="text-7xl mb-4"
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🛒
                </motion.p>
                <p className="text-xl font-bold">Tu carrito está vacío</p>
                <p className="text-sm mt-2">Agrega productos para comenzar</p>
              </motion.div>
            ) : (
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <AnimatePresence>
                  {cart.map((item, idx) => (
                    <motion.div
                      key={item.menu_item_id}
                      className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 flex items-center gap-4 group hover:shadow-lg transition-shadow"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      layout
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-lg">{item.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{fmt(item.price, currencySymbol)} cada uno</p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 bg-gray-100/80 rounded-xl p-1">
                        <motion.button
                          onClick={() => updateQty(item.menu_item_id, -1)}
                          className="w-10 h-10 rounded-lg bg-white hover:bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center transition-all"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          −
                        </motion.button>
                        <span className="text-gray-900 font-black w-8 text-center tabular-nums">{item.qty}</span>
                        <motion.button
                          onClick={() => updateQty(item.menu_item_id, 1)}
                          className="w-10 h-10 rounded-lg text-white font-bold text-lg flex items-center justify-center transition-all"
                          style={{ backgroundColor: primaryColor }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          +
                        </motion.button>
                      </div>

                      {/* Price and remove */}
                      <div className="text-right min-w-[90px]">
                        <p className="font-black text-lg text-gray-900">{fmt(item.price * item.qty, currencySymbol)}</p>
                        <motion.button
                          onClick={() => removeFromCart(item.menu_item_id)}
                          className="text-xs text-red-500 font-bold mt-1 hover:text-red-600 transition-colors"
                          whileHover={{ scale: 1.05 }}
                        >
                          Eliminar
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Pricing summary */}
                {taxRate > 0 && (
                  <motion.div
                    className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-3 mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">{fmt(cartTotal, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Impuestos ({taxRate}%)</span>
                      <span className="font-semibold">{fmt(tax, currencySymbol)}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Sticky checkout bar */}
        <AnimatePresence>
          {cart.length > 0 && (
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-4 shadow-2xl"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
            >
              <div className="max-w-xl mx-auto">
                <motion.div
                  className="flex items-center justify-between mb-4 px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="text-gray-600 font-medium">Total a pagar</span>
                  <span className="text-3xl font-black" style={{ color: primaryColor }}>
                    {fmt(grandTotal, currencySymbol)}
                  </span>
                </motion.div>
                <motion.button
                  onClick={() => setStep('checkout')}
                  className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl border border-white/30 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                  whileHover={{ scale: 1.02, boxShadow: `0 12px 24px ${primaryColor}40` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Continuar con el pago</span>
                  <span className="text-xl">→</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // ── Menu screen ─────────────────────────────────────────────────────────────
  const visibleItems = activeCategory
    ? menuItems.filter(i => i.category_id === activeCategory)
    : menuItems

  const featuredItems = menuItems.filter(i => i.featured).slice(0, 5)

  useEffect(() => {
    if (featuredItems.length === 0) return
    const timer = setInterval(() => {
      setCarouselIdx(prev => (prev + 1) % featuredItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [featuredItems.length])

  return (
    <motion.div
      className="h-screen flex flex-col bg-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Fullscreen prompt overlay */}
      <AnimatePresence>
        {showFsPrompt && !isFullscreen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer bg-gradient-to-br"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${lighten(primaryColor, 20)})`,
            }}
            onClick={() => { toggleFullscreen(); setShowFsPrompt(false) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center text-white"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <motion.p
                className="text-8xl mb-8"
                animate={{ y: [-20, 0, -20] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🖥️
              </motion.p>
              <p className="text-5xl font-black mb-4 drop-shadow-lg">Toca para comenzar</p>
              <p className="text-xl opacity-90 font-semibold">{appName}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader />

      {/* Main content - flex row layout with sidebar */}
      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Left Sidebar - Categories */}
        <motion.div
          className="flex-shrink-0 w-56 bg-gray-50 border-r border-gray-200 overflow-y-auto flex flex-col"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-3 space-y-3 flex-1">
            {categories.map((cat, idx) => {
              const isActive = activeCategory === cat.id
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="w-full overflow-hidden rounded-xl font-bold text-sm transition-all border-2 flex flex-col h-32"
                  style={{
                    backgroundColor: isActive ? primaryColor : '#fff',
                    borderColor: isActive ? primaryColor : '#e5e7eb',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {/* Image */}
                  <div className="relative h-20 w-full overflow-hidden bg-gray-200">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl" style={{ backgroundColor: `${primaryColor}20` }}>
                        🍽️
                      </div>
                    )}
                  </div>
                  {/* Name */}
                  <div className="flex-1 flex items-center justify-center px-2 pb-2"
                    style={{ color: isActive ? '#fff' : '#1f2937' }}
                  >
                    {cat.name}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Hero Banner Carousel */}
          {featuredItems.length > 0 && (
            <motion.div className="flex-shrink-0 px-6 py-5">
              <motion.div
                className="relative h-48 rounded-2xl overflow-hidden shadow-2xl group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={carouselIdx}
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    {featuredItems[carouselIdx].image_url ? (
                      <img
                        src={featuredItems[carouselIdx].image_url}
                        alt={featuredItems[carouselIdx].name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-6xl"
                        style={{ backgroundColor: `${primaryColor}20` }}
                      >
                        🍽️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                      <p className="text-white text-xl font-black mb-1">{featuredItems[carouselIdx].name}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-white/90 text-sm line-clamp-1">{featuredItems[carouselIdx].description}</p>
                        <p className="text-yellow-300 text-lg font-black ml-4 flex-shrink-0">
                          {fmt(featuredItems[carouselIdx].price, currencySymbol)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Carousel controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {featuredItems.map((_, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setCarouselIdx(idx)}
                      className="h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: idx === carouselIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                        width: idx === carouselIdx ? 24 : 8,
                      }}
                      whileHover={{ scale: 1.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Products grid */}
          <motion.div
            className="flex-1 overflow-y-auto px-6 py-5 pb-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <motion.p
                className="text-6xl mb-4"
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🍽️
              </motion.p>
              <p className="text-lg font-bold text-gray-500">No hay productos</p>
              <p className="text-sm text-gray-400">en esta categoría</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              layout
            >
              <AnimatePresence>
                {visibleItems.map((item, idx) => {
                  const qty = getQtyInCart(item.id)
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { setSelectedItem(item); setItemQty(1) }}
                      className="bg-white rounded-2xl shadow-md overflow-hidden text-left transition-all border border-gray-200 group hover:shadow-lg hover:border-gray-300 flex flex-col"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -8, shadow: '0 20px 40px rgba(0,0,0,0.3)' }}
                      layout
                    >
                      {/* Image */}
                      <div className="relative overflow-hidden h-40">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-4xl"
                            style={{ backgroundColor: `${primaryColor}25` }}
                          >
                            🍽️
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Qty badge */}
                        <AnimatePresence>
                          {qty > 0 && (
                            <motion.div
                              className="absolute top-3 right-3 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm"
                              style={{ backgroundColor: primaryColor }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              ×{qty}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Info */}
                      <div className="p-4 flex flex-col flex-1">
                        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1 mb-3">
                          {item.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-base" style={{ color: primaryColor }}>
                            {fmt(item.price, currencySymbol)}
                          </p>
                          <motion.div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg transition-all"
                            style={{ backgroundColor: primaryColor }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            +
                          </motion.div>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
      </div>

      {/* Cart floating button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
          >
            <motion.button
              onClick={() => setStep('cart')}
              className="flex items-center justify-between px-6 py-4 rounded-2xl text-white font-black text-lg shadow-2xl border border-white/30 backdrop-blur-xl gap-4"
              style={{
                backgroundColor: primaryColor,
                background: `linear-gradient(135deg, ${primaryColor}, ${lighten(primaryColor, 15)})`,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="bg-white/25 rounded-full px-3 py-1 text-sm font-bold"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}
              </motion.span>
              <span>Ver pedido</span>
              <span className="text-yellow-200 font-black">{fmt(grandTotal, currencySymbol)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item detail modal */}
      <AnimatePresence mode="wait">
        {selectedItem && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              {/* Image */}
              <motion.div className="relative overflow-hidden h-56">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-7xl"
                    style={{ backgroundColor: `${primaryColor}15` }}
                  >
                    🍽️
                  </div>
                )}
                <motion.button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </motion.div>

              {/* Content */}
              <motion.div
                className="p-7"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-start justify-between mb-3 gap-4">
                  <h3 className="text-2xl font-black text-gray-900 leading-tight flex-1">
                    {selectedItem.name}
                  </h3>
                  <p className="text-2xl font-black flex-shrink-0" style={{ color: primaryColor }}>
                    {fmt(selectedItem.price, currencySymbol)}
                  </p>
                </div>

                {selectedItem.description && (
                  <motion.p
                    className="text-gray-500 text-sm mb-6 leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {selectedItem.description}
                  </motion.p>
                )}

                {/* Quantity selector */}
                <motion.div
                  className="flex items-center justify-center gap-5 mb-8 py-5 bg-gradient-to-r rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}10, ${lighten(primaryColor, 40)}10)`,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.button
                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                    className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 text-gray-700 text-2xl font-bold flex items-center justify-center transition-all shadow-md border-2 border-gray-200"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    −
                  </motion.button>
                  <motion.span
                    className="text-4xl font-black text-gray-900 w-16 text-center tabular-nums"
                    key={itemQty}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                  >
                    {itemQty}
                  </motion.span>
                  <motion.button
                    onClick={() => setItemQty(q => q + 1)}
                    className="w-14 h-14 rounded-full text-white text-2xl font-bold flex items-center justify-center transition-all shadow-lg border-2"
                    style={{
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    +
                  </motion.button>
                </motion.div>

                {/* Add to cart button */}
                <motion.button
                  onClick={() => { addToCart(selectedItem, itemQty); setSelectedItem(null) }}
                  className="w-full py-5 rounded-2xl text-white font-black text-lg transition-all shadow-xl border border-white/30"
                  style={{
                    backgroundColor: primaryColor,
                    background: `linear-gradient(135deg, ${primaryColor}, ${lighten(primaryColor, 15)})`,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  Agregar — {fmt(selectedItem.price * itemQty, currencySymbol)}
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
