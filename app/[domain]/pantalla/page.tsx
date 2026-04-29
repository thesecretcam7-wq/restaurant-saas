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
  return order.order_number.replace('ORD-', '').slice(-4)
}

export default function PantallaPage({ params }: Props) {
  const { domain } = use(params)
  const [data, setData] = useState<DisplayData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState<Date | null>(null)
  const [newReadyIds, setNewReadyIds] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFsPrompt, setShowFsPrompt] = useState(true)
  const prevReadyRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<AudioContext | null>(null)

  // Mount flag to prevent hydration errors
  useEffect(() => {
    setMounted(true)
    setTime(new Date())
  }, [])

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

  const playBeep = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
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

      // Ensure all values have proper defaults
      const safeData: DisplayData = {
        restaurantName: json.restaurantName || 'Restaurante',
        primaryColor: json.primaryColor || '#2563eb',
        orders: Array.isArray(json.orders) ? json.orders : []
      }

      const currentReady = new Set(
        safeData.orders.filter(o => o.status === 'ready').map(o => o.id)
      )
      const appeared = [...currentReady].filter(id => !prevReadyRef.current.has(id))
      if (appeared.length > 0) {
        playBeep()
        setNewReadyIds(new Set(appeared))
        setTimeout(() => setNewReadyIds(new Set()), 3000)
      }
      prevReadyRef.current = currentReady
      setData(safeData)
    } catch {}
  }, [domain, playBeep])

  useEffect(() => {
    fetchOrders()
    const poll = setInterval(fetchOrders, 4000)
    return () => clearInterval(poll)
  }, [fetchOrders])

  useEffect(() => {
    if (!mounted) return
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [mounted])

  const confirmed = data?.orders.filter(o => o.status === 'confirmed') ?? []
  const preparing = data?.orders.filter(o => o.status === 'preparing') ?? []
  const ready = data?.orders.filter(o => o.status === 'ready') ?? []

  const primary = data?.primaryColor || '#2563eb'

  return (
    <div className="min-h-screen text-white flex flex-col select-none" style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: primary + '08', color: '#fff' }}>

      {/* Fullscreen prompt overlay */}
      {mounted && showFsPrompt && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm cursor-pointer"
          onClick={() => { toggleFullscreen(); setShowFsPrompt(false) }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
        >
          <div className="text-center">
            <p className="text-7xl mb-6">🖥️</p>
            <p className="text-3xl font-bold text-white mb-3">Toca para activar pantalla completa</p>
            <p className="text-gray-400 text-lg">{data?.restaurantName ?? 'Pantalla de pedidos'}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5" style={{ borderBottom: `2px solid ${primary}40` }}>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primary }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: primary }}>
            {data?.restaurantName ?? '—'}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={toggleFullscreen}
            className="text-gray-600 hover:text-gray-300 transition-colors text-sm flex items-center gap-1.5"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              </svg>
            )}
          </button>
          <div className="text-right">
            <p className="text-3xl font-mono font-semibold tabular-nums text-white">
              {time ? time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {time ? time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </p>
          </div>
        </div>
      </header>

      {/* Columns */}
      <div className="flex flex-1" style={{ borderRight: `1px solid ${primary}20` }}>
        {/* Confirmados */}
        <div className="flex-1 flex flex-col">
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${primary}20`, backgroundColor: primary + '08' }}>
            <span className="text-3xl">🧾</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: primary }}>Confirmado</h2>
              <p className="text-sm text-gray-500">{confirmed.length} {confirmed.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {confirmed.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: primary + '66' }}>Sin pedidos nuevos</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {confirmed.map(order => (
                  <div
                    key={order.id}
                    className="flex items-center justify-center rounded-2xl border-2"
                    style={{
                      width: 160,
                      height: 160,
                      borderColor: primary + '66',
                      backgroundColor: primary + '1a',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: primary + 'b3' }}>Pedido</p>
                      <p className="text-6xl font-black tabular-nums" style={{ color: primary + 'cc' }}>
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
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${primary}20`, borderLeft: `1px solid ${primary}20`, borderRight: `1px solid ${primary}20`, backgroundColor: primary + '08' }}>
            <span className="text-3xl">🔥</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: primary + 'dd' }}>En Preparación</h2>
              <p className="text-sm text-gray-500">{preparing.length} {preparing.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {preparing.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: primary + '66' }}>Sin pedidos en preparación</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {preparing.map(order => (
                  <div
                    key={order.id}
                    className="flex items-center justify-center rounded-2xl border-2"
                    style={{
                      width: 160,
                      height: 160,
                      borderColor: primary + '80',
                      backgroundColor: primary + '26',
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: primary + 'cc' }}>Pedido</p>
                      <p className="text-6xl font-black tabular-nums" style={{ color: primary + 'dd' }}>
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
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${primary}20`, borderLeft: `1px solid ${primary}20`, backgroundColor: primary + '08' }}>
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: primary }}>Listos para Recoger</h2>
              <p className="text-sm text-gray-500">{ready.length} {ready.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {ready.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: primary + '66' }}>Sin pedidos listos</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                {ready.map(order => {
                  const isNew = newReadyIds.has(order.id)
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-center rounded-2xl border-2 transition-all duration-500"
                      style={{
                        width: 160,
                        height: 160,
                        borderColor: isNew ? primary : primary + '66',
                        backgroundColor: isNew ? primary + '4d' : primary + '1a',
                        transform: isNew ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isNew ? `0 0 40px ${primary}66` : 'none',
                      }}
                    >
                      <div className="text-center">
                        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: primary + 'b3' }}>Pedido</p>
                        <p className="text-6xl font-black tabular-nums" style={{ color: isNew ? primary + 'ff' : primary + 'cc' }}>
                          {getShortNumber(order)}
                        </p>
                        {isNew && (
                          <p className="text-xs font-bold mt-2 animate-bounce" style={{ color: primary }}>¡LISTO!</p>
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
      <footer className="px-10 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${primary}20`, backgroundColor: primary + '08' }}>
        <p className="text-xs" style={{ color: primary + '80' }}>Pasa a recoger tu pedido cuando aparezca en "Listos"</p>
        <p className="text-xs" style={{ color: primary + '66' }}>Actualización automática cada 4 segundos</p>
      </footer>
    </div>
  )
}
