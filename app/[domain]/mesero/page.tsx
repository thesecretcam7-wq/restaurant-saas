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

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const [currencyInfo, setCurrencyInfo] = useState({ code: 'COP', locale: 'es-CO' })
  const [tenantId_real, setTenantIdReal] = useState('')
  const [primary, setPrimary] = useState('#3B82F6')

  useEffect(() => {
    // Check if already authenticated
    try {
      const session = localStorage.getItem(`staff_session_${tenantId}`)
      if (session) {
        const { role, expires } = JSON.parse(session)
        if (role === 'waiter' && Date.now() < expires) {
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
        const sessionData = {
          role: 'waiter',
          permissions: data.permissions || [],
          expires: Date.now() + 12 * 60 * 60 * 1000,
          tenantId: data.tenantId,
        }

        // Guardar en localStorage
        localStorage.setItem(`staff_session_${tenantId}`, JSON.stringify(sessionData))

        // Guardar también en cookie para que el servidor pueda acceder
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
          items: cart.map(c => ({ item_id: c.item_id, name: c.name, price: c.price, qty: c.qty })),
          customerInfo: { name: `Mesa ${tableNumber}`, email: null, phone: null },
          deliveryType: 'dine-in',
          tableNumber,
          waiterName: 'Mesero',
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
          {/* Header with brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-4 mx-auto shadow-lg">
              <span className="text-4xl">👨‍🍳</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-wide">Acceso Mesero</h1>
            <p className="text-gray-400 text-sm">Ingresa tu PIN de seguridad</p>
          </div>

          {/* PIN display */}
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
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full animate-scale-in" />}
              </div>
            ))}
          </div>

          {pinError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-300 text-sm text-center font-medium">
              {pinError}
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {KEYPAD.map((key, i) => (
              <button
                key={i}
                onClick={() => handleKeypad(key)}
                disabled={key === '' || pinLoading}
                className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 ${
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
            className="w-full h-14 rounded-xl font-black text-white text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            style={{
              backgroundColor: pin.length >= 4 && !pinLoading ? primary : '#6B7280',
              background: pin.length >= 4 && !pinLoading ? `linear-gradient(135deg, ${primary} 0%, #1e3a8a 100%)` : undefined
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
        <div className="text-center max-w-sm">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-2xl animate-scale-in">
            <span className="text-5xl">✅</span>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-black text-white mb-3 tracking-wide">¡Pedido Confirmado!</h1>
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-3 mb-6">
            <p className="text-blue-300 font-bold">Mesa {tableNumber}</p>
            <p className="text-blue-200 text-sm mt-1">El pedido está en la cocina</p>
          </div>

          {/* Info */}
          <p className="text-gray-400 mb-8 text-sm">Tu mesa ha sido notificada. Prepárate para la siguiente orden.</p>

          {/* Action Button */}
          <button
            onClick={handleNewOrder}
            className="w-full h-14 rounded-xl font-black text-white text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            style={{
              background: `linear-gradient(135deg, ${primary} 0%, #1e3a8a 100%)`
            }}
          >
            Nuevo Pedido
          </button>
        </div>
      </div>
    )
  }

  // --- TABLE SELECTION ---
  if (step === 'table') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 pt-4 pb-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 w-full">
          <div>
            <p className="text-blue-400 text-xs font-bold tracking-widest mb-0.5">MESERO</p>
            <h1 className="text-2xl font-black text-white">Selecciona Mesa</h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(`staff_session_${tenantId}`)
              document.cookie = 'staff_session=; path=/; max-age=0'
              setStep('pin')
              setPin('')
            }}
            className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-semibold transition-all"
          >
            Salir
          </button>
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: totalTables }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => { setTableNumber(num); setStep('menu') }}
                className="h-20 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 active:from-blue-700/40 active:to-blue-900/40 text-white font-bold active:scale-95 transition-all border-2 border-gray-700 active:border-blue-500 shadow-lg"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-2xl">🍽️</span>
                  <span className="text-sm font-bold mt-1">{num}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- MENU + CONFIRM ---
  if (step === 'menu' || step === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-gray-700 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('table')}
                className="text-gray-300 hover:text-white text-xl transition-colors"
                title="Volver a seleccionar mesa"
              >
                ←
              </button>
              <div>
                <p className="text-white font-black text-base">🍽️ Mesa {tableNumber}</p>
                <p className="text-gray-400 text-xs font-medium">{cartCount} items · {formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
            </div>
            {cartCount > 0 && step === 'menu' && (
              <button
                onClick={() => setStep('confirm')}
                className="px-5 py-2.5 rounded-lg text-white text-sm font-bold transition-all duration-200 hover:shadow-lg shadow-md"
                style={{ backgroundColor: primary }}
              >
                Confirmar ({cartCount})
              </button>
            )}
            {step === 'confirm' && (
              <button
                onClick={() => setStep('menu')}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold transition-all duration-200 hover:shadow-lg shadow-md"
              >
                + Agregar
              </button>
            )}
          </div>
        </div>

        {step === 'menu' && (
          <>
            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-gray-900">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeCategory === cat.id ? 'text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                    style={activeCategory === cat.id ? { backgroundColor: primary } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-20 space-y-2">
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.item_id === item.id)
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-2xl p-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                      {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                      <p className="font-bold text-sm mt-0.5" style={{ color: primary }}>
                        {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {inCart ? (
                        <>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-8 h-8 rounded-full bg-gray-600 text-white font-bold flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-white font-bold w-5 text-center">{inCart.qty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
                            style={{ backgroundColor: primary }}
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center"
                          style={{ backgroundColor: primary }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {step === 'confirm' && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <h2 className="text-white font-bold text-lg mb-4">Confirmar pedido — Mesa {tableNumber}</h2>
            <div className="space-y-3 mb-6">
              {cart.map(item => (
                <div key={item.item_id} className="flex items-center justify-between bg-gray-800 rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-lg w-6 text-center">{item.qty}x</span>
                    <span className="text-white font-semibold">{item.name}</span>
                  </div>
                  <span className="text-gray-300 font-bold">
                    {formatPriceWithCurrency(item.price * item.qty, currencyInfo.code, currencyInfo.locale)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <div className="flex justify-between text-white">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-lg">{formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="w-full h-14 rounded-2xl font-bold text-white text-lg disabled:opacity-50 transition-all active:scale-95"
              style={{ backgroundColor: primary }}
            >
              {submitting ? 'Enviando a cocina...' : '🔔 Enviar a cocina'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
