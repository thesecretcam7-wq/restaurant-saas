'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuCategory { id: string; name: string; sort_order: number }
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number, symbol: string) {
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')}`
}

function pad(n: number) { return String(n).padStart(3, '0') }

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ appName, logoUrl, primaryColor, time }: {
  appName: string; logoUrl: string | null; primaryColor: string; time: Date
}) {
  return (
    <div className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        {logoUrl && <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
        <span className="text-xl font-bold" style={{ color: primaryColor }}>{appName}</span>
      </div>
      <div className="text-right">
        <p className="text-2xl font-mono font-semibold tabular-nums text-white">
          {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-xs text-gray-500">
          {time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>
    </div>
  )
}

function CartBar({ count, total, symbol, primaryColor, onClick }: {
  count: number; total: number; symbol: string; primaryColor: string; onClick: () => void
}) {
  if (count === 0) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl text-white font-bold text-lg shadow-xl transition-transform active:scale-95"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="bg-white/20 rounded-full px-3 py-1 text-sm">{count} {count === 1 ? 'ítem' : 'ítems'}</span>
        <span>Ver pedido</span>
        <span>{fmt(total, symbol)}</span>
      </button>
    </div>
  )
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
  const [time, setTime] = useState(new Date())
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto-reset after confirmation
  useEffect(() => {
    if (step !== 'confirmed') return
    setCountdown(12)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          reset()
          return 0
        }
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

  // Cart operations
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
    setCart(prev => {
      const next = prev.map(c => c.menu_item_id === id ? { ...c, qty: c.qty + delta } : c)
      return next.filter(c => c.qty > 0)
    })
  }

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.menu_item_id !== id))

  // CSRF helper
  const getCSRF = async (): Promise<string> => {
    const res = await fetch('/api/csrf-token')
    return res.headers.get('x-csrf-token') || ''
  }

  // Place order — cash
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

  // Place order — Stripe
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

  const { primaryColor, appName, logoUrl } = branding

  // ── Confirmed screen ────────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmed) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="text-center px-8">
          <div className="mb-6 text-6xl animate-bounce">✅</div>
          <p className="text-gray-400 text-xl mb-2">Pedido registrado</p>
          <p className="text-gray-300 text-2xl font-semibold mb-8">{confirmed.name}</p>
          <div className="bg-gray-900 border-2 border-emerald-500/60 rounded-3xl px-16 py-10 mb-8 shadow-[0_0_60px_rgba(52,211,153,0.2)]">
            <p className="text-gray-400 text-sm tracking-widest uppercase mb-2">Tu número</p>
            <p className="text-[9rem] font-black tabular-nums leading-none text-emerald-400">
              {pad(confirmed.number)}
            </p>
          </div>
          <p className="text-gray-400 text-lg mb-10">
            Pasa a recoger cuando tu número aparezca en pantalla
          </p>
          {/* Countdown bar */}
          <div className="w-64 h-2 bg-gray-800 rounded-full mx-auto mb-4 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 12) * 100}%` }}
            />
          </div>
          <p className="text-gray-600 text-sm mb-8">Nuevo pedido en {countdown}s</p>
          <button
            onClick={reset}
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    )
  }

  // ── Checkout screen ─────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Header appName={appName} logoUrl={logoUrl} primaryColor={primaryColor} time={time} />
        <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
          <button onClick={() => setStep('cart')} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2">
            ← Volver al carrito
          </button>
          <h2 className="text-2xl font-bold mb-6">Finalizar pedido</h2>

          {/* Order summary */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-6">
            {cart.map(item => (
              <div key={item.menu_item_id} className="flex justify-between py-2 text-sm">
                <span className="text-gray-300">{item.qty}× {item.name}</span>
                <span className="text-white font-medium">{fmt(item.price * item.qty, currencySymbol)}</span>
              </div>
            ))}
            {taxRate > 0 && (
              <div className="flex justify-between py-2 text-sm border-t border-gray-800 mt-2">
                <span className="text-gray-400">Impuestos ({taxRate}%)</span>
                <span className="text-gray-300">{fmt(tax, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-700 mt-1 font-bold text-lg">
              <span>Total</span>
              <span style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
            </div>
          </div>

          {/* Name input */}
          <label className="block mb-4">
            <span className="text-gray-400 text-sm mb-2 block">Tu nombre <span className="text-red-400">*</span></span>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Escribe tu nombre"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white text-xl placeholder-gray-600 focus:outline-none focus:border-gray-500"
              autoComplete="off"
            />
          </label>

          {/* Notes */}
          <label className="block mb-6">
            <span className="text-gray-400 text-sm mb-2 block">Instrucciones especiales (opcional)</span>
            <textarea
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Sin cebolla, extra salsa..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
            />
          </label>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Payment buttons */}
          <div className="space-y-3">
            <button
              onClick={placeOrderCash}
              disabled={loading}
              className="w-full py-5 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              🏧 Pagar en Caja
            </button>
            {stripeEnabled && (
              <button
                onClick={placeOrderStripe}
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                💳 Pagar con Tarjeta
              </button>
            )}
          </div>
          {loading && (
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              Procesando...
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Cart screen ─────────────────────────────────────────────────────────────
  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Header appName={appName} logoUrl={logoUrl} primaryColor={primaryColor} time={time} />
        <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full pb-36">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Tu pedido</h2>
            <button onClick={() => setStep('menu')} className="text-gray-400 hover:text-white text-sm">
              ← Seguir pidiendo
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="text-center text-gray-600 py-16">
              <p className="text-5xl mb-4">🛒</p>
              <p className="text-lg">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.menu_item_id} className="bg-gray-900 rounded-2xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-gray-400">{fmt(item.price, currencySymbol)} c/u</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQty(item.menu_item_id, -1)}
                      className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="text-white font-bold w-5 text-center tabular-nums">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.menu_item_id, 1)}
                      className="w-9 h-9 rounded-full text-white font-bold text-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >+</button>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <p className="font-bold text-white">{fmt(item.price * item.qty, currencySymbol)}</p>
                    <button
                      onClick={() => removeFromCart(item.menu_item_id)}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >Eliminar</button>
                  </div>
                </div>
              ))}

              {taxRate > 0 && (
                <div className="flex justify-between px-4 py-2 text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span>{fmt(cartTotal, currencySymbol)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between px-4 py-2 text-sm text-gray-400">
                  <span>Impuestos ({taxRate}%)</span>
                  <span>{fmt(tax, currencySymbol)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-gray-400 font-medium">Total</span>
              <span className="text-2xl font-black" style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
            </div>
            <button
              onClick={() => setStep('checkout')}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              Continuar →
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Menu screen ─────────────────────────────────────────────────────────────
  const visibleItems = activeCategory
    ? menuItems.filter(i => i.category_id === activeCategory)
    : menuItems

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Header appName={appName} logoUrl={logoUrl} primaryColor={primaryColor} time={time} />

      {/* Category tabs */}
      <div className="flex gap-3 px-6 py-4 overflow-x-auto scrollbar-hide bg-gray-900/50 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
            activeCategory === null
              ? 'text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
          style={activeCategory === null ? { backgroundColor: primaryColor } : {}}
        >
          Todo
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
              activeCategory === cat.id
                ? 'text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={activeCategory === cat.id ? { backgroundColor: primaryColor } : {}}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {visibleItems.map(item => {
            const qty = getQtyInCart(item.id)
            return (
              <button
                key={item.id}
                onClick={() => { setSelectedItem(item); setItemQty(1) }}
                className="bg-gray-900 rounded-2xl overflow-hidden text-left transition-all active:scale-95 hover:ring-2 ring-gray-700 flex flex-col"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gray-800 flex items-center justify-center text-4xl">🍽️</div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-semibold text-white text-sm leading-snug line-clamp-2 flex-1">{item.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold text-base" style={{ color: primaryColor }}>
                      {fmt(item.price, currencySymbol)}
                    </p>
                    {qty > 0 && (
                      <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5">
                        ×{qty}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {visibleItems.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            <p className="text-5xl mb-4">🍽️</p>
            <p>No hay productos disponibles</p>
          </div>
        )}
      </div>

      {/* Cart bar */}
      <CartBar
        count={cartCount}
        total={grandTotal}
        symbol={currencySymbol}
        primaryColor={primaryColor}
        onClick={() => setStep('cart')}
      />

      {/* Item modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {selectedItem.image_url ? (
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-52 object-cover" />
            ) : (
              <div className="w-full h-40 bg-gray-800 flex items-center justify-center text-6xl">🍽️</div>
            )}
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-1">{selectedItem.name}</h3>
              {selectedItem.description && (
                <p className="text-gray-400 text-sm mb-4">{selectedItem.description}</p>
              )}
              <p className="text-2xl font-black mb-6" style={{ color: primaryColor }}>
                {fmt(selectedItem.price, currencySymbol)}
              </p>

              {/* Qty selector */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <button
                  onClick={() => setItemQty(q => Math.max(1, q - 1))}
                  className="w-12 h-12 rounded-full bg-gray-800 text-white text-2xl font-bold flex items-center justify-center"
                >−</button>
                <span className="text-3xl font-black text-white w-10 text-center tabular-nums">{itemQty}</span>
                <button
                  onClick={() => setItemQty(q => q + 1)}
                  className="w-12 h-12 rounded-full text-white text-2xl font-bold flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >+</button>
              </div>

              <button
                onClick={() => { addToCart(selectedItem, itemQty); setSelectedItem(null) }}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                Agregar — {fmt(selectedItem.price * itemQty, currencySymbol)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
