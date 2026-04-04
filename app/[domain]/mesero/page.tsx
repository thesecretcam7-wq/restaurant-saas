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
        localStorage.setItem(`staff_session_${tenantId}`, JSON.stringify({
          role: 'waiter',
          expires: Date.now() + 12 * 60 * 60 * 1000,
        }))
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Plan Pro requerido</h1>
          <p className="text-gray-400 mb-6">El sistema de mesero está disponible en planes Pro y Premium.</p>
          <a href={`/${tenantId}/configuracion/planes`} className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl">
            Ver planes
          </a>
        </div>
      </div>
    )
  }

  // --- PIN SCREEN ---
  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">👨‍🍳</div>
            <h1 className="text-2xl font-bold text-white">Acceso Mesero</h1>
            <p className="text-gray-400 text-sm mt-1">Ingresa tu PIN de 4-6 dígitos</p>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  i < pin.length
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-600 bg-transparent'
                }`}
              >
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-red-400 text-center text-sm mb-4">{pinError}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {KEYPAD.map((key, i) => (
              <button
                key={i}
                onClick={() => handleKeypad(key)}
                disabled={key === '' || pinLoading}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                  key === ''
                    ? 'invisible'
                    : key === '⌫'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length < 4 || pinLoading}
            className="w-full h-14 rounded-2xl font-bold text-white text-lg transition-all disabled:opacity-40"
            style={{ backgroundColor: primary }}
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
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Pedido enviado!</h1>
          <p className="text-gray-400 mb-2">Mesa {tableNumber}</p>
          <p className="text-gray-500 text-sm mb-8">El pedido ya está en cocina</p>
          <button
            onClick={handleNewOrder}
            className="w-full max-w-xs h-14 rounded-2xl font-bold text-white text-lg"
            style={{ backgroundColor: primary }}
          >
            Nuevo pedido
          </button>
        </div>
      </div>
    )
  }

  // --- TABLE SELECTION ---
  if (step === 'table') {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-white">Seleccionar mesa</h1>
            <button
              onClick={() => { localStorage.removeItem(`staff_session_${tenantId}`); setStep('pin'); setPin('') }}
              className="text-gray-500 text-sm"
            >
              Salir
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: totalTables }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => { setTableNumber(num); setStep('menu') }}
                className="h-16 rounded-2xl bg-gray-800 text-white font-bold text-lg hover:bg-gray-700 active:scale-95 transition-all"
              >
                {num}
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
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('table')} className="text-gray-400 mr-1">←</button>
              <div>
                <p className="text-white font-bold text-sm">Mesa {tableNumber}</p>
                <p className="text-gray-400 text-xs">{cartCount} items · {formatPriceWithCurrency(cartTotal, currencyInfo.code, currencyInfo.locale)}</p>
              </div>
            </div>
            {cartCount > 0 && step === 'menu' && (
              <button
                onClick={() => setStep('confirm')}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                style={{ backgroundColor: primary }}
              >
                Ver pedido ({cartCount})
              </button>
            )}
            {step === 'confirm' && (
              <button onClick={() => setStep('menu')} className="text-gray-400 text-sm">
                + Agregar más
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
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
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
