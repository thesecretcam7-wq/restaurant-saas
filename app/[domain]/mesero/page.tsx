'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'

type Step = 'pin' | 'table' | 'menu' | 'confirm' | 'done'

interface CartItem {
  item_id: string
  name: string
  price: number
  qty: number
  image_url?: string
  notes?: string
}

interface Category {
  id: string
  name: string
}

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  category_id?: string
  available: boolean
}

const KEYPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export default function MeseroPage() {
  const params = useParams()
  const tenantId = params.domain as string

  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [totalTables, setTotalTables] = useState(10)
  const [waiterName, setWaiterName] = useState('Mesero')

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const [currencyInfo, setCurrencyInfo] = useState({ code: 'COP', locale: 'es-CO' })
  const [tenantId_real, setTenantIdReal] = useState('')
  const [primary, setPrimary] = useState('#3B82F6')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)

  useEffect(() => {
    try {
      const session = localStorage.getItem(`staff_session_${tenantId}`)
      if (session) {
        const parsed = JSON.parse(session)
        if (parsed.role === 'waiter' && Date.now() < parsed.expires) {
          if (parsed.waiterName) setWaiterName(parsed.waiterName)
          loadMenuData()
          setStep('table')
          return
        }
      }
    } catch {}
  }, [tenantId])

  const loadMenuData = useCallback(async () => {
    const [catRes, itemRes, settingsRes, brandingRes] = await Promise.all([
      fetch(`/api/menu-categories?domain=${tenantId}`),
      fetch(`/api/products?domain=${tenantId}`),
      fetch(`/api/restaurant-settings?domain=${tenantId}`).catch(() => null),
      fetch(`/api/tenant/branding?domain=${tenantId}`).catch(() => null),
    ])
    const catData = await catRes.json()
    const itemData = await itemRes.json()

    setCategories(catData.categories || [])
    const availableItems = (itemData.items || []).filter((i: MenuItem) => i.available)
    setItems(availableItems)

    if (settingsRes && settingsRes.ok) {
      const s = await settingsRes.json()
      setTotalTables(s.total_tables || 10)
      setTenantIdReal(s.tenant_id || '')
      if (s.country_code) {
        const ci = getCurrencyByCountry(s.country_code)
        setCurrencyInfo({ code: ci.code, locale: ci.locale })
      }
    }

    if (brandingRes && brandingRes.ok) {
      const b = await brandingRes.json()
      if (b.primary_color) setPrimary(b.primary_color)
    }
  }, [tenantId])

  const handleKeypad = (key: string) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1))
      setPinError('')
    } else if (key === '') {
      return
    } else if (pin.length < 6) {
      setPin(p => p + key)
      setPinError('')
    }
  }

  const handlePinSubmit = async () => {
    if (pin.length < 4) { setPinError('Ingresa mínimo 4 dígitos'); return }
    setPinLoading(true)
    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantId, pin, role: 'waiter' }),
      })
      const data = await res.json()
      if (data.success) {
        const name = data.name || data.waiterName || 'Mesero'
        setWaiterName(name)
        const sessionData = {
          role: 'waiter',
          permissions: data.permissions || [],
          expires: Date.now() + 12 * 60 * 60 * 1000,
          tenantId: data.tenantId,
          waiterName: name,
        }
        localStorage.setItem(`staff_session_${tenantId}`, JSON.stringify(sessionData))
        document.cookie = `staff_session=${JSON.stringify(sessionData)}; path=/; max-age=${12 * 60 * 60}`
        await loadMenuData()
        setStep('table')
      } else if (data.requiresUpgrade) {
        setRequiresUpgrade(true)
      } else {
        setPinError(data.error || 'PIN incorrecto')
        setPin('')
      }
    } catch {
      setPinError('Error de conexión')
    }
    setPinLoading(false)
  }

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id)
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item_id: item.id, name: item.name, price: item.price, qty: 1, image_url: item.image_url }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === itemId)
      if (!existing) return prev
      if (existing.qty === 1) return prev.filter(c => c.item_id !== itemId)
      return prev.map(c => c.item_id === itemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart(prev => prev.map(c => c.item_id === itemId ? { ...c, notes } : c))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  const filteredItems = activeCategory
    ? items.filter(i => i.category_id === activeCategory)
    : items

  const handleSubmitOrder = async () => {
    if (cart.length === 0 || !tableNumber) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenantId_real || tenantId,
          items: cart.map(c => ({ item_id: c.item_id, name: c.name, price: c.price, qty: c.qty, notes: c.notes })),
          customerInfo: { name: `Mesa ${tableNumber}`, email: null, phone: null },
          deliveryType: 'dine-in',
          tableNumber,
          waiterName,
          paymentMethod: 'cash',
          notes: `Pedido de mesa ${tableNumber}`,
        }),
      })
      if (res.ok) {
        setStep('done')
      }
    } catch {}
    setSubmitting(false)
  }

  const handleNewOrder = () => {
    setCart([])
    setTableNumber(null)
    setStep('table')
  }

  const handleLogout = () => {
    localStorage.removeItem(`staff_session_${tenantId}`)
    document.cookie = 'staff_session=; path=/; max-age=0'
    setStep('pin')
    setPin('')
  }

  // --- UPGRADE SCREEN ---
  if (requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-6 shadow-lg">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-wide">Plan Premium Requerido</h1>
          <p className="text-gray-400 mb-8">El sistema de mesero está disponible en planes Pro y Premium.</p>
          <a
            href={`/${tenantId}/configuracion/planes`}
            className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-md"
          >
            Ver Planes Disponibles
          </a>
        </div>
      </div>
    )
  }

  // --- PIN SCREEN ---
  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-4 mx-auto shadow-lg">
              <span className="text-4xl">👨‍🍳</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-wide">Acceso Mesero</h1>
            <p className="text-gray-400 text-sm">Ingresa tu PIN de seguridad</p>
          </div>

          <div className="flex justify-center gap-2.5 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                  i < pin.length
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 shadow-lg'
                    : 'border-gray-600 bg-gray-800/50 border-opacity-40'
                }`}
              >
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {pinError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-300 text-sm text-center font-medium">
              {pinError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {KEYPAD.map((key, i) => (
              <button
                key={i}
                onClick={() => handleKeypad(key)}
                disabled={key === '' || pinLoading}
                className={`h-16 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                  key === ''
                    ? 'invisible'
                    : key === '⌫'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                    : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-gray-600 shadow-md'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length < 4 || pinLoading}
            className="w-full h-14 rounded-xl font-black text-white text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: pin.length >= 4 && !pinLoading ? `linear-gradient(135deg, ${primary} 0%, #1e3a8a 100%)` : '#6B7280'
            }}
          >
            {pinLoading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  // --- DONE SCREEN ---
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950/20 to-gray-950 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-2xl">
            <span className="text-5xl">✅</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-wide">¡Pedido Confirmado!</h1>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-4 mb-6">
            <p className="text-blue-300 font-black text-2xl">Mesa {tableNumber}</p>
            <p className="text-blue-200 text-sm mt-1">El pedido está en camino a la cocina</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-4 mb-8 text-left">
            {cart.map(item => (
              <div key={item.item_id} className="flex justify-between text-sm text-gray-300 py-1">
                <span>{item.qty}× {item.name}</span>
                <span>{formatPriceWithCurrency(item.price * item.qty, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between font-bold text-white">
              <span>Total</span>
              <span>{formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</span>
            </div>
          </div>
          <button
            onClick={handleNewOrder}
            className="w-full h-14 rounded-xl font-black text-white text-lg transition-all duration-200 shadow-lg active:scale-95"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, #1e3a8a 100%)` }}
          >
            Nueva Comanda
          </button>
          <button
            onClick={handleLogout}
            className="w-full h-12 rounded-xl font-semibold text-gray-400 hover:text-white text-sm mt-3 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // --- TABLE SELECTION ---
  if (step === 'table') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest" style={{ color: primary }}>MESERO · {waiterName.toUpperCase()}</p>
            <h1 className="text-xl font-black text-white">Selecciona Mesa</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-all"
          >
            Salir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-gray-500 text-xs mb-4">{totalTables} mesas disponibles — toca una para comenzar</p>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: totalTables }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => { setTableNumber(num); setStep('menu') }}
                className="h-24 rounded-2xl bg-gray-800 active:scale-95 transition-all border-2 border-gray-700 active:border-blue-500 shadow-lg flex flex-col items-center justify-center gap-1"
              >
                <span className="text-2xl">🍽️</span>
                <span className="text-white font-black text-lg leading-none">{num}</span>
                <span className="text-gray-500 text-xs">Mesa</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- MENU ---
  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('table')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 text-white text-xl active:scale-95 flex-shrink-0"
            >
              ←
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base truncate">Mesa {tableNumber}</p>
              <p className="text-gray-400 text-xs">{waiterName}</p>
            </div>
            {cartCount > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-800 rounded-xl px-3 py-2">
                <span className="text-white font-bold text-sm">{cartCount}</span>
                <span className="text-gray-400 text-xs">items</span>
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="bg-gray-900 border-b border-gray-800">
            <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                  !activeCategory ? 'text-white' : 'bg-gray-700 text-gray-300'
                }`}
                style={!activeCategory ? { backgroundColor: primary } : {}}
              >
                Todo
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                    activeCategory === cat.id ? 'text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: primary } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Items list — single column for max readability on phones */}
        <div className="flex-1 overflow-y-auto pb-28">
          <div className="divide-y divide-gray-800">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.item_id === item.id)
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-gray-950 active:bg-gray-900 transition-colors">
                  {/* Image */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{item.name}</p>
                    {item.description && (
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                    <p className="font-black text-sm mt-1" style={{ color: primary }}>
                      {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {inCart ? (
                      <>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-10 h-10 rounded-xl bg-gray-700 text-white font-bold text-xl flex items-center justify-center active:scale-95 transition-all"
                        >
                          −
                        </button>
                        <span className="text-white font-black text-lg w-6 text-center">{inCart.qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-10 h-10 rounded-xl text-white font-bold text-xl flex items-center justify-center active:scale-95 transition-all"
                          style={{ backgroundColor: primary }}
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-10 h-10 rounded-xl text-white font-bold text-xl flex items-center justify-center active:scale-95 transition-all"
                        style={{ backgroundColor: primary }}
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                <span className="text-4xl mb-3">🍽️</span>
                <p className="text-sm">Sin productos en esta categoría</p>
              </div>
            )}
          </div>
        </div>

        {/* Floating cart bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
            <button
              onClick={() => setStep('confirm')}
              className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-between px-5 shadow-2xl active:scale-95 transition-all"
              style={{ backgroundColor: primary }}
            >
              <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-black">{cartCount}</span>
              <span>Ver pedido</span>
              <span>{formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // --- CONFIRM ---
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setStep('menu')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 text-white text-xl active:scale-95 flex-shrink-0"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-white font-black text-base">Confirmar Pedido</p>
            <p className="text-gray-400 text-xs">Mesa {tableNumber} · {waiterName}</p>
          </div>
          <button
            onClick={() => setStep('menu')}
            className="px-3 py-2 rounded-xl text-white text-xs font-bold border border-gray-700 active:scale-95"
          >
            + Agregar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 p-4">
          {/* Items with notes */}
          <div className="space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.item_id} className="bg-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => removeFromCart(item.item_id)}
                        className="w-9 h-9 rounded-xl bg-gray-700 text-white font-bold flex items-center justify-center active:scale-95"
                      >
                        −
                      </button>
                      <span className="text-white font-black text-lg w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => addToCart({ id: item.item_id, name: item.name, price: item.price, available: true })}
                        className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center active:scale-95"
                        style={{ backgroundColor: primary }}
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{item.name}</p>
                      <p className="text-gray-400 text-xs font-bold">
                        {formatPriceWithCurrency(item.price * item.qty, currencyInfo.code, currencyInfo.locale)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingNotes(editingNotes === item.item_id ? null : item.item_id)}
                    className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      item.notes
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {item.notes ? '📝' : 'Nota'}
                  </button>
                </div>

                {/* Notes input (expandable) */}
                {editingNotes === item.item_id && (
                  <div className="px-3 pb-3">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={e => updateItemNotes(item.item_id, e.target.value)}
                      placeholder="sin cebolla, bien cocido..."
                      maxLength={80}
                      className="w-full bg-gray-700 border border-gray-600 focus:border-yellow-500 rounded-xl px-3 py-2.5 text-sm text-yellow-200 placeholder-gray-500 outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                )}

                {/* Notes preview (when not editing) */}
                {item.notes && editingNotes !== item.item_id && (
                  <div className="px-3 pb-3">
                    <p className="text-yellow-400/80 text-xs italic px-2 py-1.5 bg-yellow-500/10 rounded-lg">↳ {item.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bg-gray-800 rounded-2xl p-4">
            <div className="space-y-1.5 mb-3">
              {cart.map(item => (
                <div key={item.item_id} className="flex justify-between text-xs text-gray-400">
                  <span>{item.qty}× {item.name}</span>
                  <span>{formatPriceWithCurrency(item.price * item.qty, currencyInfo.code, currencyInfo.locale)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between text-white font-black text-lg">
              <span>Total</span>
              <span>{formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</span>
            </div>
          </div>
        </div>

        {/* Sticky send button */}
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent">
          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            className="w-full h-14 rounded-2xl font-black text-white text-lg disabled:opacity-50 transition-all active:scale-95 shadow-2xl"
            style={{ backgroundColor: primary }}
          >
            {submitting ? 'Enviando a cocina...' : `🔔 Enviar a cocina — Mesa ${tableNumber}`}
          </button>
        </div>
      </div>
    )
  }

  return null
}
