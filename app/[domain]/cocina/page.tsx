'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'

type KitchenStep = 'pin' | 'display'

interface KitchenOrder {
  id: string
  order_number: string
  table_number: number | null
  customer_name: string
  items: { item_id: string; name: string; qty: number; price: number }[]
  status: string
  delivery_type: string
  notes: string | null
  created_at: string
  total: number
}

const KEYPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-yellow-400',
  confirmed: 'border-yellow-400',
  preparing: 'border-blue-400',
  ready: 'border-green-400',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo ✓',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

export default function CocinaPage() {
  const params = useParams()
  const tenantId = params.domain as string

  const [step, setKitchenStep] = useState<KitchenStep>('pin')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)

  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [currencyInfo, setCurrencyInfo] = useState({ code: 'COP', locale: 'es-CO' })
  const [primary, setPrimary] = useState('#3B82F6')
  const [tenantDbId, setTenantDbId] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  const playAlert = useCallback(() => {
    // Simple beep using Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [])

  const loadOrders = useCallback(async (dbId: string) => {
    setLoading(true)
    const res = await fetch(`/api/orders?domain=${tenantId}&limit=30`)
    const data = await res.json()
    // Filter active orders: pending, confirmed, preparing, ready
    const active = (data.orders || []).filter((o: KitchenOrder) =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    )
    setOrders(active)
    setLoading(false)
  }, [tenantId])

  const loadConfig = useCallback(async () => {
    const [settingsRes, brandingRes] = await Promise.all([
      fetch(`/api/restaurant-settings?domain=${tenantId}`).catch(() => null),
      fetch(`/api/tenant/branding?domain=${tenantId}`).catch(() => null),
    ])
    if (settingsRes && settingsRes.ok) {
      const s = await settingsRes.json()
      setTenantDbId(s.tenant_id || '')
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

  const setupRealtime = useCallback((dbId: string) => {
    const channel = supabase
      .channel(`kitchen-${tenantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${dbId}` },
        (payload) => {
          const newOrder = payload.new as KitchenOrder
          if (['pending', 'confirmed', 'preparing', 'ready'].includes(newOrder.status)) {
            setOrders(prev => [newOrder, ...prev])
            playAlert()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `tenant_id=eq.${dbId}` },
        (payload) => {
          const updated = payload.new as KitchenOrder
          if (['delivered', 'cancelled'].includes(updated.status)) {
            setOrders(prev => prev.filter(o => o.id !== updated.id))
          } else {
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenantId, supabase, playAlert])

  useEffect(() => {
    try {
      const session = localStorage.getItem(`kitchen_session_${tenantId}`)
      if (session) {
        const { role, expires, dbId } = JSON.parse(session)
        if (role === 'kitchen' && Date.now() < expires) {
          loadConfig().then(() => {
            if (dbId) {
              loadOrders(dbId)
              setupRealtime(dbId)
            }
          })
          setKitchenStep('display')
          return
        }
      }
    } catch {}
  }, [tenantId])

  const handleKeypad = (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setPinError('') }
    else if (key !== '' && pin.length < 6) { setPin(p => p + key); setPinError('') }
  }

  const handlePinSubmit = async () => {
    if (pin.length < 4) { setPinError('Ingresa mínimo 4 dígitos'); return }
    setPinLoading(true)
    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantId, pin, role: 'kitchen' }),
      })
      const data = await res.json()
      if (data.success) {
        await loadConfig()
        const dbId = data.tenantId || tenantDbId
        const sessionData = {
          role: 'kitchen',
          permissions: data.permissions || [],
          expires: Date.now() + 24 * 60 * 60 * 1000,
          dbId,
          tenantId: data.tenantId,
        }

        // Guardar en localStorage
        localStorage.setItem(`kitchen_session_${tenantId}`, JSON.stringify(sessionData))

        // Guardar también en cookie para que el servidor pueda acceder
        document.cookie = `staff_session=${JSON.stringify(sessionData)}; path=/; max-age=${24 * 60 * 60}`

        await loadOrders(dbId)
        setupRealtime(dbId)
        setKitchenStep('display')
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  // --- UPGRADE SCREEN ---
  if (requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan Pro requerido</h1>
          <p className="text-gray-500 mb-6">La pantalla de cocina está disponible en planes Pro y Premium.</p>
        </div>
      </div>
    )
  }

  // --- PIN SCREEN ---
  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🍳</div>
            <h1 className="text-2xl font-bold text-gray-900">Pantalla de Cocina</h1>
            <p className="text-gray-500 text-sm mt-1">Ingresa el PIN de cocina</p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  i < pin.length ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                }`}
              >
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {pinError && <p className="text-red-500 text-center text-sm mb-4">{pinError}</p>}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {KEYPAD.map((key, i) => (
              <button
                key={i}
                onClick={() => handleKeypad(key)}
                disabled={key === '' || pinLoading}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 shadow-sm ${
                  key === '' ? 'invisible'
                  : key === '⌫' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pin.length < 4 || pinLoading}
            className="w-full h-14 rounded-2xl font-bold text-white text-lg disabled:opacity-40"
            style={{ backgroundColor: '#F97316' }}
          >
            {pinLoading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  // --- KITCHEN DISPLAY ---
  const pendingOrders = orders.filter(o => ['pending', 'confirmed'].includes(o.status))
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍳</span>
          <div>
            <h1 className="text-gray-900 font-bold text-xl">Cocina</h1>
            <p className="text-gray-500 text-xs">{orders.length} pedidos activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadOrders(tenantDbId)}
            className="text-gray-600 hover:text-gray-900 text-sm px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            ↻ Actualizar
          </button>
          <button
            onClick={() => { localStorage.removeItem(`kitchen_session_${tenantId}`); setKitchenStep('pin'); setPin('') }}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Salir
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Cargando pedidos...</p>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-gray-600 font-medium">Sin pedidos pendientes</p>
          <p className="text-gray-400 text-sm mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p>
        </div>
      )}

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pending orders first */}
        {pendingOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            currencyInfo={currencyInfo}
            onAction={() => updateOrderStatus(order.id, 'preparing')}
            actionLabel="▶ Empezar"
            actionColor="#3B82F6"
          />
        ))}
        {/* Then preparing */}
        {preparingOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            currencyInfo={currencyInfo}
            onAction={() => updateOrderStatus(order.id, 'ready')}
            actionLabel="✓ Marcar listo"
            actionColor="#22C55E"
          />
        ))}
        {/* Then ready */}
        {readyOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            currencyInfo={currencyInfo}
            onAction={() => updateOrderStatus(order.id, 'delivered')}
            actionLabel="→ Entregado"
            actionColor="#6B7280"
          />
        ))}
      </div>
    </div>
  )
}

function OrderCard({
  order, currencyInfo, onAction, actionLabel, actionColor
}: {
  order: KitchenOrder
  currencyInfo: { code: string; locale: string }
  onAction: () => void
  actionLabel: string
  actionColor: string
}) {
  return (
    <div className={`bg-white rounded-2xl border-l-4 p-4 shadow-sm ${STATUS_COLORS[order.status] || 'border-gray-300'}`}>
      {/* Order header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {order.delivery_type === 'dine-in' && order.table_number && (
              <span className="text-2xl font-black text-gray-900">Mesa {order.table_number}</span>
            )}
            {order.delivery_type === 'pickup' && (
              <span className="text-lg font-bold text-gray-900">🏃 Para llevar</span>
            )}
            {order.delivery_type === 'delivery' && (
              <span className="text-lg font-bold text-gray-900">🛵 A domicilio</span>
            )}
          </div>
          <p className="text-gray-500 text-xs">{order.order_number} · {order.customer_name}</p>
        </div>
        <div className="text-right">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            order.status === 'ready' ? 'bg-green-100 text-green-700' :
            order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
          <p className="text-gray-400 text-xs mt-1">{timeAgo(order.created_at)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-gray-900 font-black text-lg w-6">{item.qty}x</span>
            <span className="text-gray-700 font-medium text-sm">{item.name}</span>
          </div>
        ))}
      </div>

      {order.notes && order.notes !== `Pedido de mesa ${order.table_number}` && (
        <p className="text-yellow-700 text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 mb-3">
          📝 {order.notes}
        </p>
      )}

      {/* Action button */}
      {order.status !== 'ready' && (
        <button
          onClick={onAction}
          className="w-full py-2.5 rounded-xl text-white font-bold text-sm transition-all active:scale-95"
          style={{ backgroundColor: actionColor }}
        >
          {actionLabel}
        </button>
      )}
      {order.status === 'ready' && (
        <button
          onClick={onAction}
          className="w-full py-2.5 rounded-xl text-gray-600 font-bold text-sm bg-gray-100 transition-all active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
