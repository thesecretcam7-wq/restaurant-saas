'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuCategory { id: string; name: string; sort_order: number; image_url?: string | null }
interface MenuItem {
  id: string; name: string; description: string | null
  price: number; image_url: string | null; available: boolean
  category_id: string | null; featured: boolean
}
interface Banner { id: string; title: string; image_url: string; link_url: string | null; sort_order: number }
interface CartItem { menu_item_id: string; name: string; price: number; qty: number }
type Step = 'menu' | 'cart' | 'checkout' | 'confirmed'

interface Props {
  tenantId: string
  domain: string
  branding: { appName: string; primaryColor: string; logoUrl: string | null }
  categories: MenuCategory[]
  menuItems: MenuItem[]
  banners: Banner[]
  taxRate: number
  currencySymbol: string
  stripeEnabled: boolean
  initialConfirmed?: { number: number; name: string }
}

function fmt(amount: number, symbol: string) {
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')}`
}

function pad(n: number) { return String(n).padStart(3, '0') }

// Darken a hex color by a percentage for hover states
function darken(hex: string, amount = 20): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - amount)
  const g = Math.max(0, ((num >> 8) & 0xff) - amount)
  const b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

// ─── App Header Component ─────────────────────────────────────────────────
function AppHeader({
  primaryColor,
  appName,
  logoUrl,
  time,
  backLabel,
  onBack,
  cartCount,
}: {
  primaryColor: string
  appName: string
  logoUrl: string | null
  time: Date | null
  backLabel?: string
  onBack?: () => void
  cartCount?: number
}) {
  return (
    <header
      className="flex items-center justify-between px-8 py-4 flex-shrink-0 text-white"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="mr-2 bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
        )}
        {logoUrl && <img src={logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/30" />}
        <div>
          <p className="text-xl font-black leading-tight">{appName}</p>
          {backLabel && <p className="text-xs opacity-75">{backLabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-6">
        {cartCount !== undefined && cartCount > 0 && (
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="font-bold text-sm">{cartCount}</span>
          </div>
        )}
        <div className="text-right">
          <p className="text-2xl font-mono font-bold tabular-nums">
            {time?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) ?? ''}
          </p>
          <p className="text-xs opacity-70">
            {time?.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' }) ?? ''}
          </p>
        </div>
      </div>
    </header>
  )
}

// ─── Horizontal Banner Carousel ──────────────────────────────────────────────
function HorizontalBannerCarousel({
  banners,
  containerRef,
}: {
  banners: Banner[]
  containerRef: React.RefObject<HTMLDivElement | null>
}) {
  const touchStartX = useRef(0)
  const [bannerIdx, setBannerIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx(prev => (prev + 1) % (banners.length || 1))
    }, 6000)
    return () => clearInterval(interval)
  }, [banners.length])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setBannerIdx(prev => (prev + 1) % banners.length)
      } else {
        setBannerIdx(prev => (prev - 1 + banners.length) % banners.length)
      }
    }
  }

  if (banners.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="bg-white border-b border-gray-200 p-4 overflow-x-auto flex gap-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {banners.map(banner => (
        <a
          key={banner.id}
          href={banner.link_url || '#'}
          target={banner.link_url ? '_blank' : undefined}
          rel={banner.link_url ? 'noopener noreferrer' : undefined}
          className="flex-shrink-0 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="h-32 object-cover"
          />
        </a>
      ))}
    </div>
  )
}

// ─── Category Product Modal ───────────────────────────────────────────────────
function CategoryProductModal({
  category,
  products,
  banners,
  currencySymbol,
  primaryColor,
  onClose,
  onSelectItem,
}: {
  category: MenuCategory
  products: MenuItem[]
  banners: Banner[]
  currencySymbol: string
  primaryColor: string
  onClose: () => void
  onSelectItem: (item: MenuItem) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-4 px-6 py-4 text-white flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <button
            onClick={onClose}
            className="bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-xl font-black">{category.name}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Banners carousel */}
          {banners.length > 0 && (
            <HorizontalBannerCarousel banners={banners} containerRef={containerRef} />
          )}

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
              <p className="text-6xl mb-4">🍽️</p>
              <p className="text-lg font-medium">No hay productos en esta categoría</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {products.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden text-left transition-all active:scale-95 hover:shadow-md flex flex-col group border border-gray-100"
                  >
                    <div className="relative overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-44 flex items-center justify-center text-6xl" style={{ backgroundColor: `${primaryColor}15` }}>
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1 mb-3">{item.name}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-black text-lg" style={{ color: primaryColor }}>
                          {fmt(item.price, currencySymbol)}
                        </p>
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md transition-transform active:scale-90"
                          style={{ backgroundColor: primaryColor }}
                        >
                          +
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KioskoClient({
  tenantId, domain, branding, categories, menuItems, banners,
  taxRate, currencySymbol, stripeEnabled, initialConfirmed,
}: Props) {
  const [step, setStep] = useState<Step>(initialConfirmed ? 'confirmed' : 'menu')
  const [activeCategory, setActiveCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
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
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement | null>(null)

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

  // Infinite scroll handler for category carousel
  useEffect(() => {
    const container = categoryScrollRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const itemHeight = 140 // height of each category card
      const oneSetHeight = categories.length * itemHeight

      // When scrolled past 2/3 of the way, reset to the beginning of the second set
      if (scrollTop > oneSetHeight * 1.5) {
        container.scrollTop = oneSetHeight
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [categories.length])

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


  // ── Confirmed screen ────────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmed) {
    return (
      <div className="h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <AppHeader primaryColor={primaryColor} appName={appName} logoUrl={logoUrl} time={time} />
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="text-center w-full max-w-md">
            <div
              className="rounded-3xl p-10 mb-8 shadow-2xl"
              style={{ backgroundColor: primaryColor }}
            >
              <p className="text-white/80 text-sm tracking-widest uppercase mb-2 font-semibold">Tu número de turno</p>
              <p className="text-[9rem] font-black tabular-nums leading-none text-white">
                {pad(confirmed.number)}
              </p>
            </div>
            <p className="text-2xl font-bold text-gray-800 mb-2">{confirmed.name}</p>
            <p className="text-gray-500 text-lg mb-8">
              Pasa a recoger cuando tu número aparezca en la pantalla
            </p>
            <div className="w-full h-3 bg-gray-200 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 12) * 100}%`, backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-gray-400 text-sm mb-6">Nuevo pedido en {countdown}s</p>
            <button
              onClick={reset}
              className="px-10 py-4 rounded-2xl text-white font-bold text-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              Hacer otro pedido
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Checkout screen ─────────────────────────────────────────────────────────
  if (step === 'checkout') {
    return (
      <div className="h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <AppHeader primaryColor={primaryColor} appName={appName} logoUrl={logoUrl} time={time} backLabel="Volver al carrito" onBack={() => setStep('cart')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Finalizar pedido</h2>

            {/* Order summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Resumen</p>
              {cart.map(item => (
                <div key={item.menu_item_id} className="flex justify-between py-2 text-sm border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{item.qty}× {item.name}</span>
                  <span className="font-semibold text-gray-900">{fmt(item.price * item.qty, currencySymbol)}</span>
                </div>
              ))}
              {taxRate > 0 && (
                <div className="flex justify-between pt-3 text-sm text-gray-500">
                  <span>Impuestos ({taxRate}%)</span>
                  <span>{fmt(tax, currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-100 mt-2 font-black text-xl">
                <span className="text-gray-900">Total</span>
                <span style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
              </div>
            </div>

            {/* Name input */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <label className="block">
                <span className="text-sm font-bold text-gray-700 mb-2 block">
                  Tu nombre <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="¿Cómo te llamamos?"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-xl placeholder-gray-300 focus:outline-none transition-colors"
                  style={{ borderColor: customerName ? primaryColor : undefined }}
                  autoComplete="off"
                />
              </label>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <label className="block">
                <span className="text-sm font-bold text-gray-700 mb-2 block">Instrucciones especiales <span className="text-gray-400 font-normal">(opcional)</span></span>
                <textarea
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Sin cebolla, extra salsa..."
                  rows={2}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-300 focus:outline-none resize-none"
                />
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Payment buttons */}
            <div className="space-y-3 pb-8">
              <button
                onClick={placeOrderCash}
                disabled={loading}
                className="w-full py-5 rounded-2xl text-white font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                🏧 Pagar en Caja
              </button>
              {stripeEnabled && (
                <button
                  onClick={placeOrderStripe}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-98 disabled:opacity-50"
                >
                  💳 Pagar con Tarjeta
                </button>
              )}
              {loading && (
                <div className="flex items-center justify-center gap-2 pt-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
                  Procesando...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Cart screen ─────────────────────────────────────────────────────────────
  if (step === 'cart') {
    return (
      <div className="h-screen flex flex-col bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <AppHeader primaryColor={primaryColor} appName={appName} logoUrl={logoUrl} time={time} backLabel="Seguir pidiendo" onBack={() => setStep('menu')} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto p-6 pb-40">
            <h2 className="text-2xl font-black text-gray-900 mb-5">Tu pedido</h2>

            {cart.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-6xl mb-4">🛒</p>
                <p className="text-lg font-medium">Tu carrito está vacío</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.menu_item_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{fmt(item.price, currencySymbol)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.menu_item_id, -1)}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors"
                      >−</button>
                      <span className="text-gray-900 font-black w-6 text-center tabular-nums text-lg">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.menu_item_id, 1)}
                        className="w-10 h-10 rounded-full text-white font-bold text-xl flex items-center justify-center transition-colors"
                        style={{ backgroundColor: primaryColor }}
                      >+</button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="font-black text-gray-900">{fmt(item.price * item.qty, currencySymbol)}</p>
                      <button onClick={() => removeFromCart(item.menu_item_id)} className="text-xs text-red-400 mt-0.5">
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                {taxRate > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span><span>{fmt(cartTotal, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Impuestos ({taxRate}%)</span><span>{fmt(tax, currencySymbol)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-gray-500 font-medium">Total a pagar</span>
                <span className="text-2xl font-black" style={{ color: primaryColor }}>{fmt(grandTotal, currencySymbol)}</span>
              </div>
              <button
                onClick={() => setStep('checkout')}
                className="w-full py-4 rounded-2xl text-white font-black text-xl shadow-lg transition-all active:scale-98"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar con el pago →
              </button>
            </div>
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
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Fullscreen prompt overlay */}
      {showFsPrompt && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ backgroundColor: primaryColor }}
          onClick={() => { toggleFullscreen(); setShowFsPrompt(false) }}
        >
          <div className="text-center text-white">
            <p className="text-8xl mb-8">🖥️</p>
            <p className="text-4xl font-black mb-4">Toca para comenzar</p>
            <p className="text-xl opacity-80">{appName}</p>
          </div>
        </div>
      )}

      <AppHeader primaryColor={primaryColor} appName={appName} logoUrl={logoUrl} time={time} cartCount={cartCount} />

      {/* Body: sidebar only (products in modal) */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Category carousel ── */}
        <aside
          ref={categoryScrollRef}
          className="w-40 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0 p-3 hide-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-3">
            {/* Show categories three times for infinite scroll effect */}
            {[...categories, ...categories, ...categories].map((cat, idx) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={`${cat.id}-${idx}`}
                  onClick={() => { setActiveCategory(cat.id); setIsCategoryModalOpen(true) }}
                  className="w-full rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                  style={isActive ? { boxShadow: `0 0 0 3px ${primaryColor}` } : {}}
                >
                  <div className="relative overflow-hidden bg-gray-200 h-24 flex items-center justify-center">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-4xl">🍽️</div>
                    )}
                  </div>
                  <div className="bg-white p-2 flex-1 flex items-center justify-center min-h-12">
                    <p className="font-bold text-xs text-center text-gray-900 line-clamp-2">{cat.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main area: banners ── */}
        <div className="flex-1 flex flex-col">
          {/* Banners section */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
            {banners.length > 0 ? (
              <div className="w-full max-w-3xl">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Publicidad Destacada</h2>
                <div className="bg-white rounded-2xl p-4 overflow-x-auto flex gap-4">
                  {banners.map(banner => (
                    <a
                      key={banner.id}
                      href={banner.link_url || '#'}
                      target={banner.link_url ? '_blank' : undefined}
                      rel={banner.link_url ? 'noopener noreferrer' : undefined}
                      className="flex-shrink-0 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-48 object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p className="text-8xl mb-8">👈</p>
                <p className="text-2xl font-bold text-gray-800 mb-3">Selecciona una categoría</p>
                <p className="text-gray-500 text-center max-w-sm">Haz clic en una categoría de la izquierda para ver los productos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cart bar ── */}
      {cartCount > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
          <button
            onClick={() => setStep('cart')}
            className="w-full flex items-center justify-between px-6 py-4 rounded-2xl text-white font-black text-lg shadow-xl transition-all active:scale-98"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="bg-white/25 rounded-full px-3 py-1 text-sm font-bold">
              {cartCount} {cartCount === 1 ? 'ítem' : 'ítems'}
            </span>
            <span>Ver pedido</span>
            <span>{fmt(grandTotal, currencySymbol)}</span>
          </button>
        </div>
      )}

      {/* ── Category modal ── */}
      {isCategoryModalOpen && activeCategory && (
        <CategoryProductModal
          category={categories.find(c => c.id === activeCategory)!}
          products={visibleItems}
          banners={[]}
          currencySymbol={currencySymbol}
          primaryColor={primaryColor}
          onClose={() => setIsCategoryModalOpen(false)}
          onSelectItem={item => { setSelectedItem(item); setItemQty(1) }}
        />
      )}

      {/* ── Item modal ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {selectedItem.image_url ? (
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-56 object-cover" />
            ) : (
              <div className="w-full h-44 flex items-center justify-center text-7xl" style={{ backgroundColor: `${primaryColor}15` }}>
                🍽️
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-1 gap-4">
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedItem.name}</h3>
                <p className="text-2xl font-black flex-shrink-0" style={{ color: primaryColor }}>
                  {fmt(selectedItem.price, currencySymbol)}
                </p>
              </div>
              {selectedItem.description && (
                <p className="text-gray-500 text-sm mb-5 leading-relaxed">{selectedItem.description}</p>
              )}

              <div className="flex items-center justify-center gap-6 mb-6 py-4 bg-gray-50 rounded-2xl">
                <button
                  onClick={() => setItemQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-3xl font-bold flex items-center justify-center transition-colors"
                >−</button>
                <span className="text-4xl font-black text-gray-900 w-12 text-center tabular-nums">{itemQty}</span>
                <button
                  onClick={() => setItemQty(q => q + 1)}
                  className="w-14 h-14 rounded-full text-white text-3xl font-bold flex items-center justify-center transition-colors shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >+</button>
              </div>

              <button
                onClick={() => { addToCart(selectedItem, itemQty); setSelectedItem(null) }}
                className="w-full py-5 rounded-2xl text-white font-black text-xl transition-all active:scale-98 shadow-lg"
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
