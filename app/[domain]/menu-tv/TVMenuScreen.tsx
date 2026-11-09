'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

interface TVMenuItem {
  id: string
  name: string
  description: string | null
  price: number | string
  category: string
  image_url: string | null
  badge: string | null
  featured: boolean
}

interface TVMenuScreenProps {
  tenantId: string
  restaurantName: string
  logoUrl?: string | null
  items: TVMenuItem[]
}

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener?: (event: 'release', cb: () => void) => void
}

export function TVMenuScreen({ tenantId, restaurantName, items }: TVMenuScreenProps) {
  const [time, setTime] = useState<Date | null>(null)
  const [displayItems, setDisplayItems] = useState(items)
  const [activePage, setActivePage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const carouselItems = useMemo(
    () => displayItems.filter((item) => Boolean(item.image_url?.trim())),
    [displayItems],
  )
  const currentImage = carouselItems[activePage] || carouselItems[0]

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [])

  useEffect(() => {
    showControls()
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [showControls])

  useEffect(() => {
    setTime(new Date())
    const tick = window.setInterval(() => setTime(new Date()), 1000)
    return () => {
      window.clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    setActivePage(0)
  }, [carouselItems.length])

  useEffect(() => {
    let cancelled = false
    let inFlight = false
    let controller: AbortController | null = null

    async function refreshItems() {
      if (document.hidden || inFlight) return
      inFlight = true
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 8000)
      try {
        const response = await fetch(`/api/tv-menu/public?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return
        const data = await response.json().catch(() => null)
        if (cancelled || !Array.isArray(data?.items)) return
        setDisplayItems(data.items)
      } catch {
        // Keep the last images on screen during a temporary connection loss.
      } finally {
        clearTimeout(timeout)
        inFlight = false
      }
    }

    const poll = window.setInterval(refreshItems, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
      controller?.abort()
    }
  }, [tenantId])

  useEffect(() => {
    if (carouselItems.length <= 1) return
    const pageTick = window.setInterval(() => {
      setActivePage((page) => (page + 1) % carouselItems.length)
    }, 12_000)
    return () => window.clearInterval(pageTick)
  }, [carouselItems.length])

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = Boolean(document.fullscreenElement)
      setIsFullscreen(fullscreen)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return

    try {
      if (wakeLockRef.current) return
      const sentinel = await (navigator as Navigator & {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> }
      }).wakeLock.request('screen')

      sentinel.addEventListener?.('release', () => {
        wakeLockRef.current = null
      })
      wakeLockRef.current = sentinel
    } catch {}
  }, [])

  const enterDisplayMode = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    } catch {}
    void requestWakeLock()
  }, [requestWakeLock])

  const exitDisplayMode = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {}
  }, [])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) void requestWakeLock()
    }

    void requestWakeLock()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [requestWakeLock])

  return (
    <main
      className="fixed inset-0 overflow-hidden bg-black text-white"
      aria-label={`Publicidad de ${restaurantName}`}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onKeyDown={showControls}
    >
      {currentImage ? (
        <img
          src={currentImage.image_url!}
          alt={currentImage.name}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center">
          <div>
            <h1 className="text-3xl font-black sm:text-5xl">No hay imágenes para mostrar</h1>
            <p className="mt-4 text-lg text-white/65">Sube una imagen y activa «Mostrar en TV» desde Menú TV.</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 text-center sm:top-6">
        <time
          dateTime={time?.toISOString()}
          aria-label="Hora actual"
          className="inline-block text-[clamp(3.5rem,8vw,8rem)] font-black leading-none tabular-nums text-white [text-shadow:0_2px_6px_#000,0_4px_24px_#000]"
        >
          {time ? time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
        </time>
      </div>

      <div className={`absolute bottom-4 right-4 z-20 transition-opacity duration-300 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button
          type="button"
          onClick={isFullscreen ? exitDisplayMode : enterDisplayMode}
          onFocus={showControls}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-black/75 px-4 py-3 text-sm font-bold text-white outline-offset-4 hover:bg-black/90"
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
      </div>
    </main>
  )
}
