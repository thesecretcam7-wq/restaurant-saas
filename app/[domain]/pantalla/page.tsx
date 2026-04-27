'use client'

import { use, useEffect, useState, useRef, useCallback } from 'react'

interface DisplayOrder {
  id: string
  display_number: number | null
  order_number: string
  status: 'confirmed' | 'preparing' | 'ready'
  created_at: string
}

interface DisplayData {
  restaurantName: string
  primaryColor: string
  orders: DisplayOrder[]
}

interface Props {
  params: Promise<{ domain: string }>
}

function getShortNumber(order: DisplayOrder): string {
  if (order.display_number) return String(order.display_number).padStart(3, '0')
  // Fallback for old orders without display_number
  return order.order_number.replace('ORD-', '').slice(-4)
}

export default function PantallaPage({ params }: Props) {
  const { domain } = use(params)
  const [data, setData] = useState<DisplayData | null>(null)
  const [time, setTime] = useState(new Date())
  const [newReadyIds, setNewReadyIds] = useState<Set<string>>(new Set())
  const prevReadyRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<AudioContext | null>(null)

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext()
      }
      const ctx = audioRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/pantalla/${domain}`, { cache: 'no-store' })
      if (!res.ok) return
      const json: DisplayData = await res.json()

      const currentReady = new Set(
        json.orders.filter(o => o.status === 'ready').map(o => o.id)
      )
      const appeared = [...currentReady].filter(id => !prevReadyRef.current.has(id))
      if (appeared.length > 0) {
        playBeep()
        setNewReadyIds(new Set(appeared))
        setTimeout(() => setNewReadyIds(new Set()), 3000)
      }
      prevReadyRef.current = currentReady
      setData(json)
    } catch {}
  }, [domain, playBeep])

  useEffect(() => {
    fetchOrders()
    const poll = setInterval(fetchOrders, 4000)
    return () => clearInterval(poll)
  }, [fetchOrders])

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const confirmed = data?.orders.filter(o => o.status === 'confirmed') ?? []
  const preparing = data?.orders.filter(o => o.status === 'preparing') ?? []
  const ready = data?.orders.filter(o => o.status === 'ready') ?? []

  const primary = data?.primaryColor || '#2563eb'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primary }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: primary }}>
            {data?.restaurantName ?? '—'}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-semibold tabular-nums text-white">
            {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Columns */}
      <div className="flex flex-1 divide-x divide-gray-800">
        {/* Confirmados */}
        <div className="flex-1 flex flex-col">
          <div className="px-10 py-6 flex items-center gap-3 border-b border-gray-800 bg-gray-900/50">
            <span className="text-3xl">🧾</span>
            <div>
              <h2 className="text-xl font-bold text-sky-400 tracking-wide uppercase">Confirmado</h2>
              <p className="text-sm text-gray-500">{confirmed.length} {confirmed.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {confirmed.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-700 text-xl">Sin pedidos nuevos</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {confirmed.map(order => (
                  <div
                    key={order.id}
                    className="flex items-center justify-center rounded-2xl border-2 border-sky-500/40 bg-sky-500/10"
                    style={{ width: 160, height: 160 }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-sky-400/70 font-semibold tracking-widest uppercase mb-1">Pedido</p>
                      <p className="text-6xl font-black tabular-nums text-sky-300">
                        {getShortNumber(order)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* En preparación */}
        <div className="flex-1 flex flex-col">
          <div className="px-10 py-6 flex items-center gap-3 border-b border-gray-800 bg-gray-900/50">
            <span className="text-3xl">🔥</span>
            <div>
              <h2 className="text-xl font-bold text-amber-400 tracking-wide uppercase">En Preparación</h2>
              <p className="text-sm text-gray-500">{preparing.length} {preparing.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {preparing.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-700 text-xl">Sin pedidos en preparación</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {preparing.map(order => (
                  <div
                    key={order.id}
                    className="flex items-center justify-center rounded-2xl border-2 border-amber-500/40 bg-amber-500/10"
                    style={{ width: 160, height: 160 }}
                  >
                    <div className="text-center">
                      <p className="text-xs text-amber-400/70 font-semibold tracking-widest uppercase mb-1">Pedido</p>
                      <p className="text-6xl font-black tabular-nums text-amber-300">
                        {getShortNumber(order)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Listos para recoger */}
        <div className="flex-1 flex flex-col">
          <div className="px-10 py-6 flex items-center gap-3 border-b border-gray-800 bg-gray-900/50">
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-xl font-bold text-emerald-400 tracking-wide uppercase">Listos para Recoger</h2>
              <p className="text-sm text-gray-500">{ready.length} {ready.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {ready.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-700 text-xl">Sin pedidos listos</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {ready.map(order => {
                  const isNew = newReadyIds.has(order.id)
                  return (
                    <div
                      key={order.id}
                      className={`flex items-center justify-center rounded-2xl border-2 transition-all duration-500 ${
                        isNew
                          ? 'border-emerald-400 bg-emerald-500/30 scale-110 shadow-[0_0_40px_rgba(52,211,153,0.4)]'
                          : 'border-emerald-500/40 bg-emerald-500/10'
                      }`}
                      style={{ width: 160, height: 160 }}
                    >
                      <div className="text-center">
                        <p className="text-xs text-emerald-400/70 font-semibold tracking-widest uppercase mb-1">Pedido</p>
                        <p className={`text-6xl font-black tabular-nums ${isNew ? 'text-emerald-300' : 'text-emerald-400'}`}>
                          {getShortNumber(order)}
                        </p>
                        {isNew && (
                          <p className="text-xs text-emerald-300 font-bold mt-2 animate-bounce">¡LISTO!</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-10 py-3 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between">
        <p className="text-xs text-gray-600">Pasa a recoger tu pedido cuando aparezca en "Listos"</p>
        <p className="text-xs text-gray-700">Actualización automática cada 4 segundos</p>
      </footer>
    </div>
  )
}
