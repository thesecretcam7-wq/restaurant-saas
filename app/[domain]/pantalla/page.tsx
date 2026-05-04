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
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textPrimaryColor?: string
  textSecondaryColor?: string
  orders: DisplayOrder[]
}

interface Props {
  params: Promise<{ domain: string }>
}

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
  removeEventListener: (type: 'release', listener: () => void) => void
}

function getShortNumber(order: DisplayOrder): string {
  if (order.display_number) return String(order.display_number).padStart(3, '0')
  return order.order_number.replace('ORD-', '').slice(-4)
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function isDark(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance < 0.5
}

function readableText(background: string, preferred?: string, fallbackDark = '#15130f', fallbackLight = '#ffffff') {
  if (preferred && preferred !== background) return preferred
  return isDark(background) ? fallbackLight : fallbackDark
}

export default function PantallaPage({ params }: Props) {
  const { domain } = use(params)
  const [data, setData] = useState<DisplayData | null>(null)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState<Date | null>(null)
  const [newReadyIds, setNewReadyIds] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFsPrompt, setShowFsPrompt] = useState(true)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [wakeLockSupported, setWakeLockSupported] = useState(true)
  const prevReadyRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<AudioContext | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

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

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLockSupported(false)
      return
    }

    try {
      if (wakeLockRef.current) return
      const sentinel = await (navigator as Navigator & {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> }
      }).wakeLock.request('screen')

      const onRelease = () => {
        wakeLockRef.current = null
        setWakeLockActive(false)
      }

      sentinel.addEventListener('release', onRelease)
      wakeLockRef.current = sentinel
      setWakeLockActive(true)
      setWakeLockSupported(true)
    } catch {
      setWakeLockActive(false)
    }
  }, [])

  const activateDisplayMode = useCallback(() => {
    toggleFullscreen()
    requestWakeLock()
    setShowFsPrompt(false)
  }, [requestWakeLock, toggleFullscreen])

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
    if (!mounted) return

    const onVisibilityChange = () => {
      if (!document.hidden) requestWakeLock()
    }

    requestWakeLock()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [mounted, requestWakeLock])

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
        secondaryColor: json.secondaryColor || '#111827',
        accentColor: json.accentColor || json.primaryColor || '#2563eb',
        backgroundColor: json.backgroundColor || '#0b0b0b',
        textPrimaryColor: json.textPrimaryColor || '#ffffff',
        textSecondaryColor: json.textSecondaryColor || '#d1d5db',
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
  const secondary = data?.secondaryColor || '#111827'
  const accent = data?.accentColor || primary
  const screenBg = data?.backgroundColor || '#0b0b0b'
  const textColor = readableText(screenBg, data?.textPrimaryColor)
  const mutedText = readableText(screenBg, data?.textSecondaryColor, 'rgba(21,19,15,0.62)', 'rgba(255,255,255,0.66)')
  const primaryText = readableText(primary)
  const secondaryText = readableText(secondary)
  const accentText = readableText(accent)
  const cardBg = secondary
  const cardText = readableText(cardBg, data?.textPrimaryColor)

  return (
    <div
      className="min-h-screen text-white flex flex-col select-none"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: screenBg,
        color: textColor
      }}
    >

      {/* Fullscreen prompt overlay */}
      {mounted && showFsPrompt && !isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm cursor-pointer"
          onClick={activateDisplayMode}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
        >
          <div className="text-center">
            <p className="text-7xl mb-6">🖥️</p>
            <p className="text-3xl font-bold text-white mb-3">Toca para activar pantalla completa</p>
            <p className="text-gray-400 text-lg">{data?.restaurantName ?? 'Pantalla de pedidos'}</p>
            <p className="text-gray-500 text-sm mt-3">Tambien mantiene la pantalla activa durante el servicio</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5" style={{ borderBottom: `3px solid ${primary}`, backgroundColor: screenBg }}>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: primary }} />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: textColor }}>
            {data?.restaurantName ?? '—'}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={activateDisplayMode}
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
          <button
            onClick={requestWakeLock}
            className="text-xs font-semibold px-3 py-2 rounded-full border transition-colors"
            style={{
              color: wakeLockActive ? primary : mutedText,
              borderColor: wakeLockActive ? primary : mutedText,
              backgroundColor: wakeLockActive ? `${primary}22` : 'transparent'
            }}
            title={wakeLockSupported ? 'Mantener pantalla activa' : 'Este navegador no permite bloquear reposo'}
          >
            {wakeLockActive ? 'Pantalla activa' : 'Evitar reposo'}
          </button>
          <div className="text-right">
            <p className="text-3xl font-mono font-semibold tabular-nums" style={{ color: textColor }}>
              {time ? time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </p>
            <p className="text-sm mt-0.5" style={{ color: mutedText }}>
              {time ? time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </p>
          </div>
        </div>
      </header>

      {/* Columns */}
      <div className="flex flex-1" style={{ borderRight: `1px solid ${primary}` }}>
        {/* Confirmados */}
        <div className="flex-1 flex flex-col">
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${primary}`, backgroundColor: primary }}>
            <span className="text-3xl">🧾</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: primaryText }}>Confirmado</h2>
              <p className="text-sm" style={{ color: primaryText }}>{confirmed.length} {confirmed.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {confirmed.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: mutedText }}>Sin pedidos nuevos</p>
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
                      borderColor: primary,
                      backgroundColor: cardBg,
                      boxShadow: `0 0 0 1px ${primary} inset`,
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: cardText }}>Pedido</p>
                      <p className="text-6xl font-black tabular-nums" style={{ color: primary }}>
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
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${secondary}`, borderLeft: `1px solid ${secondary}`, borderRight: `1px solid ${secondary}`, backgroundColor: secondary }}>
            <span className="text-3xl">🔥</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: secondaryText }}>En Preparación</h2>
              <p className="text-sm" style={{ color: secondaryText }}>{preparing.length} {preparing.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {preparing.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: mutedText }}>Sin pedidos en preparación</p>
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
                      borderColor: secondary,
                      backgroundColor: cardBg,
                    }}
                  >
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: cardText }}>Pedido</p>
                      <p className="text-6xl font-black tabular-nums" style={{ color: accent }}>
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
          <div className="px-10 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}`, backgroundColor: accent }}>
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase" style={{ color: accentText }}>Listos para Recoger</h2>
              <p className="text-sm" style={{ color: accentText }}>{ready.length} {ready.length === 1 ? 'pedido' : 'pedidos'}</p>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-auto">
            {ready.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xl" style={{ color: mutedText }}>Sin pedidos listos</p>
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
                        borderColor: accent,
                        backgroundColor: isNew ? accent : cardBg,
                        transform: isNew ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isNew ? `0 0 46px ${accent}` : 'none',
                      }}
                    >
                      <div className="text-center">
                        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: isNew ? accentText : cardText }}>Pedido</p>
                        <p className="text-6xl font-black tabular-nums" style={{ color: isNew ? accentText : accent }}>
                          {getShortNumber(order)}
                        </p>
                        {isNew && (
                          <p className="text-xs font-bold mt-2 animate-bounce" style={{ color: accentText }}>¡LISTO!</p>
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
      <footer className="px-10 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${primary}`, backgroundColor: screenBg }}>
        <p className="text-xs" style={{ color: mutedText }}>Pasa a recoger tu pedido cuando aparezca en "Listos"</p>
        <p className="text-xs" style={{ color: mutedText }}>Actualización automática cada 4 segundos</p>
      </footer>
    </div>
  )
}
