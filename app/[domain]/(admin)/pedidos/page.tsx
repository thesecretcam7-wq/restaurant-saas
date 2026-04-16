'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  total: number
  status: string
  payment_status: string
  delivery_type: string
  created_at: string
  items: any[]
}

export default function PedidosPage() {
  const params = useParams()
  const domain = params.domain as string

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'preparing'>('all')
  const [wakeLock, setWakeLock] = useState<any>(null)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showSoundPrompt, setShowSoundPrompt] = useState(true)
  const previousOrderIds = useRef<Set<string>>(new Set())
  const alertedDelayedOrders = useRef<Set<string>>(new Set())
  const delayedOrderCheckInterval = useRef<NodeJS.Timeout | null>(null)

  // Activar Wake Lock manualmente (requiere interacción del usuario)
  const activateWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const wakeLockSentinel = await navigator.wakeLock.request('screen')
        setWakeLock(wakeLockSentinel)
        setWakeLockActive(true)
        console.log('✅ Wake Lock activado - Pantalla bloqueada')

        wakeLockSentinel.addEventListener('release', () => {
          console.log('⚠️ Wake Lock liberado - reintentando...')
          setWakeLockActive(false)
          setTimeout(activateWakeLock, 2000)
        })
      } else {
        console.warn('⚠️ Wake Lock API no soportada')
        alert('⚠️ Tu navegador no soporta bloqueo de pantalla. Intenta con Chrome o Firefox.')
      }
    } catch (err: any) {
      console.warn('⚠️ Error al activar Wake Lock:', err)
      if (err.name === 'NotAllowedError') {
        alert('❌ Debes permitir que el navegador bloquee la pantalla')
      }
    }
  }

  // Mantener pantalla encendida - MÉTODO MÚLTIPLE
  useEffect(() => {
    let screenKeepAliveInterval: NodeJS.Timeout | null = null

    // Método 1: Mantener pantalla activa con eventos cada 10 segundos
    const keepScreenAwake = () => {
      document.dispatchEvent(new MouseEvent('mousemove'))
    }

    screenKeepAliveInterval = setInterval(keepScreenAwake, 10000)

    // Método 2: Re-adquirir wake lock si la página regresa del background
    const handleVisibilityChange = () => {
      if (!document.hidden && wakeLock) {
        console.log('📱 Página en foreground - wake lock activo')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (screenKeepAliveInterval) clearInterval(screenKeepAliveInterval)
      if (wakeLock) {
        wakeLock.release().catch(() => {})
      }
    }
  }, [wakeLock])

  // Fetch de pedidos con polling automático
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?domain=${domain}&status=${filter === 'all' ? '' : filter}`)
        if (!res.ok) throw new Error('Error fetching orders')
        const data = await res.json()
        const newOrders = data.orders || []

        // Detectar pedidos nuevos
        const currentOrderIds = new Set<string>(newOrders.map((o: Order) => o.id))
        const newOrderIds = newOrders.filter((o: Order) => !previousOrderIds.current.has(o.id))

        if (newOrderIds.length > 0 && previousOrderIds.current.size > 0) {
          // Solo reproducir sonido si hay pedidos nuevos (no en la primera carga)
          playAlertSound('nuevo')
        }

        previousOrderIds.current = currentOrderIds
        setOrders(newOrders)

        // Verificar pedidos atrasados (preparing > 15 minutos)
        checkDelayedOrders(newOrders)
      } catch (err) {
        console.error('Error fetching orders:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) {
      fetchOrders()

      // Polling cada 3 segundos
      const interval = setInterval(fetchOrders, 3000)

      // Verificar pedidos atrasados cada 30 segundos
      delayedOrderCheckInterval.current = setInterval(() => {
        checkDelayedOrders(orders)
      }, 30000)

      return () => {
        clearInterval(interval)
        if (delayedOrderCheckInterval.current) {
          clearInterval(delayedOrderCheckInterval.current)
        }
      }
    }
  }, [domain, filter, orders])

  // Desbloquear sonido (requiere acción del usuario)
  const unlockSound = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      // Reanudar contexto si está suspendido
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      setSoundEnabled(true)
      setShowSoundPrompt(false)
      playAlertSound('nuevo')
      console.log('✅ Sonido desbloqueado')
    } catch (err) {
      console.warn('Error al desbloquear sonido:', err)
    }
  }

  // Reproducir sonido de alerta con Web Audio API - VOLUMEN 100%
  const playAlertSound = (type: 'nuevo' | 'atrasado' = 'nuevo') => {
    if (!soundEnabled) return // No reproducir si sonido no está desbloqueado

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const now = audioContext.currentTime

      if (type === 'nuevo') {
        // 🔔 Nuevo pedido: 2 beeps rápidos (800Hz + 1000Hz)
        console.log('🔔 ¡Nuevo pedido! Sonido reproducido')

        // Primer beep
        const osc1 = audioContext.createOscillator()
        const gain1 = audioContext.createGain()
        osc1.connect(gain1)
        gain1.connect(audioContext.destination)

        osc1.frequency.value = 800
        gain1.gain.setValueAtTime(1.0, now) // 100% volumen
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)

        osc1.start(now)
        osc1.stop(now + 0.4)

        // Segundo beep
        setTimeout(() => {
          const osc2 = audioContext.createOscillator()
          const gain2 = audioContext.createGain()
          osc2.connect(gain2)
          gain2.connect(audioContext.destination)

          osc2.frequency.value = 1000
          gain2.gain.setValueAtTime(1.0, audioContext.currentTime) // 100% volumen
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)

          osc2.start(audioContext.currentTime)
          osc2.stop(audioContext.currentTime + 0.4)
        }, 200)
      } else if (type === 'atrasado') {
        // ⚠️ Pedido atrasado: 3 beeps más lentos (600Hz)
        console.log('⚠️ ¡Pedido tardando! Sonido reproducido')

        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)

            osc.frequency.value = 600
            gain.gain.setValueAtTime(1.0, audioContext.currentTime) // 100% volumen
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

            osc.start(audioContext.currentTime)
            osc.stop(audioContext.currentTime + 0.3)
          }, i * 500)
        }
      }
    } catch (err) {
      console.warn('Error al reproducir sonido:', err)
    }
  }

  // Verificar pedidos que están tardando demasiado
  const checkDelayedOrders = (allOrders: Order[]) => {
    const now = new Date().getTime()
    const DELAY_THRESHOLD = 15 * 60 * 1000 // 15 minutos en milisegundos

    allOrders.forEach(order => {
      // Solo verificar pedidos en "preparing"
      if (order.status === 'preparing') {
        const createdTime = new Date(order.created_at).getTime()
        const elapsedTime = now - createdTime

        // Si el pedido lleva más de 15 minutos y aún no hemos alertado
        if (elapsedTime > DELAY_THRESHOLD && !alertedDelayedOrders.current.has(order.id)) {
          alertedDelayedOrders.current.add(order.id)
          playAlertSound('atrasado')
        }
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmada' },
      preparing: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Preparando' },
      on_the_way: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'En camino' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Entregada' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Pagada</span>
    }
    if (status === 'pending') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendiente</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Fallida</span>
  }

  // Calcular tiempo transcurrido del pedido
  const getOrderTime = (createdAt: string) => {
    const now = new Date().getTime()
    const created = new Date(createdAt).getTime()
    const diffMs = now - created
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Hace poco'
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    return `${hours}h ${diffMins % 60}m`
  }

  // Badge de tiempo - rojo si está atrasado (> 15 min en preparing)
  const getTimeDelayBadge = (order: Order) => {
    if (order.status !== 'preparing') return null

    const now = new Date().getTime()
    const createdTime = new Date(order.created_at).getTime()
    const elapsedMins = Math.floor((now - createdTime) / 60000)
    const DELAY_THRESHOLD = 15

    const timeStr = getOrderTime(order.created_at)

    if (elapsedMins > DELAY_THRESHOLD) {
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-200 text-red-900 animate-pulse">⚠️ {timeStr}</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">{timeStr}</span>
  }

  return (
    <div className="space-y-6">
      {/* Banner para desbloquear sonido */}
      {showSoundPrompt && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="font-semibold text-red-900">Habilita las alertas de sonido</p>
              <p className="text-sm text-red-700">Necesitamos tu permiso para reproducir sonidos cuando lleguen pedidos</p>
            </div>
          </div>
          <button
            onClick={unlockSound}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            Permitir Sonido 🔊
          </button>
        </div>
      )}

      {/* Banner estado sonido */}
      {soundEnabled && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xl">🔊</span>
          <p className="font-medium text-green-900">✅ Sonido habilitado - Recibirás alertas de pedidos</p>
        </div>
      )}

      {/* Banner para bloquear pantalla */}
      {!wakeLockActive && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔓</span>
            <div>
              <p className="font-semibold text-orange-900">Bloquea la pantalla para cocina</p>
              <p className="text-sm text-orange-700">Sin esto, la tableta se apagará automáticamente</p>
            </div>
          </div>
          <button
            onClick={activateWakeLock}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"
          >
            Bloquear Pantalla 🔒
          </button>
        </div>
      )}

        {/* Header con indicador Wake Lock */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-600 mt-1">Gestiona todas las órdenes de tu restaurante</p>
        </div>
        <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
          wakeLockActive
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${wakeLockActive ? 'bg-green-600 animate-pulse' : 'bg-yellow-600'}`}></span>
          {wakeLockActive ? '🔒 Pantalla Bloqueada' : '⚠️ Verificando pantalla'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'confirmed', 'preparing'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status === 'all' && 'Todas'}
            {status === 'pending' && 'Pendientes'}
            {status === 'confirmed' && 'Confirmadas'}
            {status === 'preparing' && 'Preparando'}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando pedidos...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600 text-lg font-medium">No hay pedidos</p>
              <p className="text-slate-500 text-sm">Los pedidos aparecerán aquí cuando los clientes realicen compras</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Pedido</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Pago</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Entrega</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map(order => (
                  <tr key={order.id} className={`transition-colors ${order.status === 'preparing' && new Date().getTime() - new Date(order.created_at).getTime() > 15 * 60 * 1000 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      <Link href={`/${domain}/admin/pedidos/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <div>{order.customer_name}</div>
                      <div className="text-xs text-slate-500">{order.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">${order.total.toLocaleString('es-CO')}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(order.status)}</td>
                    <td className="px-6 py-4 text-sm">{getPaymentBadge(order.payment_status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {order.delivery_type === 'delivery' ? '🚗 Delivery' : '🏪 Recogida'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getTimeDelayBadge(order) || new Date(order.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/${domain}/admin/pedidos/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
