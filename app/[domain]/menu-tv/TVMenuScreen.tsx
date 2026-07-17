'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Tv } from 'lucide-react'

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

function money(value: unknown) {
  const parsed = Number(String(value || 0).replace(',', '.'))
  return Number.isFinite(parsed)
    ? parsed.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
    : '0,00 €'
}

function hasPrice(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0
}

function isDailyMenu(item: TVMenuItem) {
  return (item.category || '').trim().toLowerCase() === 'menu del dia'
}

function sameCategory(item: TVMenuItem, category: string) {
  return (item.category || '').trim().toLowerCase() === category.trim().toLowerCase()
}

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener?: (event: 'release', cb: () => void) => void
}

export function TVMenuScreen({ tenantId, restaurantName, logoUrl, items }: TVMenuScreenProps) {
  const [time, setTime] = useState<Date | null>(null)
  const [displayItems, setDisplayItems] = useState(items)
  const [activePage, setActivePage] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const leftPanelCategory = useMemo(() => {
    const daily = displayItems.find(isDailyMenu)
    return daily?.category || displayItems[0]?.category || 'Menu del dia'
  }, [displayItems])

  const menuItems = useMemo(() => {
    return displayItems.filter((item) => sameCategory(item, leftPanelCategory)).slice(0, 8)
  }, [displayItems, leftPanelCategory])

  const carouselItems = useMemo(() => {
    const newProductImages = displayItems.filter((item) => item.image_url && !sameCategory(item, leftPanelCategory))
    const fallbackImages = displayItems.filter((item) => item.image_url)
    if (newProductImages.length) return newProductImages
    return fallbackImages.length ? fallbackImages : displayItems
  }, [displayItems, leftPanelCategory])
  const featured = carouselItems[activePage] || carouselItems[0]

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const tick = window.setInterval(() => setTime(new Date()), 1000)
    return () => {
      window.clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    setActivePage(0)
  }, [displayItems.length])

  useEffect(() => {
    let cancelled = false

    async function refreshItems() {
      try {
        const response = await fetch(`/api/tv-menu/public?tenantId=${tenantId}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => null)
        if (cancelled || !Array.isArray(data?.items)) return
        setDisplayItems(data.items)
      } catch {}
    }

    const poll = window.setInterval(refreshItems, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
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
      if (fullscreen) setShowFullscreenPrompt(false)
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
        setWakeLockActive(false)
      })
      wakeLockRef.current = sentinel
      setWakeLockActive(true)
    } catch {
      setWakeLockActive(false)
    }
  }, [])

  const enterDisplayMode = useCallback(async () => {
    setShowFullscreenPrompt(false)
    await requestWakeLock()
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    } catch {}
  }, [requestWakeLock])

  const exitDisplayMode = useCallback(async () => {
    setShowFullscreenPrompt(false)
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
    <main className="relative h-screen overflow-hidden bg-[#111114] text-white">
      {featured?.image_url && (
        <div className="absolute inset-0 opacity-22">
          <img src={featured.image_url} alt="" className="h-full w-full object-cover blur-2xl" />
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,14,18,0.94)_0%,rgba(46,25,21,0.88)_48%,rgba(17,17,20,0.94)_100%)]" />

      {mounted && showFullscreenPrompt && !isFullscreen && (
        <button
          type="button"
          onClick={enterDisplayMode}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black/92 px-6 text-center backdrop-blur-sm"
        >
          <Tv className="h-24 w-24 text-[#f5c542]" />
          <span className="mt-7 text-4xl font-black text-white">Toca para pantalla completa</span>
          <span className="mt-3 text-lg font-bold text-white/55">El menu ocupara todo el televisor y cambiara de pagina automaticamente.</span>
        </button>
      )}

      <section className="relative z-10 h-screen min-h-0 p-4 sm:p-6 xl:p-8">
        <div className="absolute right-4 top-4 z-20 flex shrink-0 items-center gap-4 sm:right-6 sm:top-6 xl:right-8 xl:top-8">
          <button
            type="button"
            onClick={isFullscreen ? exitDisplayMode : enterDisplayMode}
            className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/18"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
          </button>
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums text-white xl:text-5xl">{time ? time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
            <p className="mt-1 text-sm font-bold capitalize text-white/55 xl:text-lg">{time ? time.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}</p>
            {wakeLockActive && <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#f5c542]">Activa</p>}
          </div>
        </div>

        {displayItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <p className="text-7xl font-black text-[#f5c542]">MENU TV</p>
              <p className="mt-5 text-3xl font-bold text-white/60">Agrega productos desde el panel admin.</p>
            </div>
          </div>
        ) : (
          <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)] gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:gap-7">
            <aside className="grid min-h-0 content-start gap-3 overflow-hidden rounded-[30px] border border-white/14 bg-white/[0.07] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl xl:p-4">
              <div className="px-2 pb-1">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#f5c542]">{leftPanelCategory}</p>
              </div>
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="grid min-h-[86px] min-w-0 grid-cols-[82px_1fr] items-center gap-3 rounded-[22px] border border-white/12 bg-white/[0.08] p-2 text-left text-white xl:min-h-[100px] xl:grid-cols-[96px_1fr]"
                >
                  <div className="relative h-[72px] overflow-hidden rounded-2xl bg-[#17171d] xl:h-20">
                    {item.image_url ? (
                      <>
                        <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-md opacity-75" />
                        <div className="absolute inset-0 bg-black/20" />
                        <img src={item.image_url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                      </>
                    ) : (
                      <div className="grid h-full place-items-center text-xl font-black text-black/20">TV</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black leading-tight text-white xl:text-xl">{item.name}</p>
                    {hasPrice(item.price) && <p className="mt-1 text-base font-black text-[#f5c542]">{money(item.price)}</p>}
                  </div>
                </div>
              ))}
            </aside>

            {featured && (
              <article className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[34px] border border-white/18 bg-white/[0.08] shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                <div className="relative min-h-0 overflow-hidden bg-[#17171d]">
                  {featured.image_url ? (
                    <>
                      <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl opacity-80" />
                      <div className="absolute inset-0 bg-black/24" />
                      <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.38)]" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a10] to-[#111827]" />
                  )}
                  {featured.badge && (
                    <div className="absolute left-6 top-6 flex gap-3">
                      <span className="rounded-full bg-[#f5c542] px-5 py-2 text-xl font-black uppercase text-black shadow-xl">{featured.badge}</span>
                    </div>
                  )}
                </div>
                <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-5 border-t border-white/14 bg-[#17171d]/94 p-5 xl:p-8">
                  <div className="min-w-0">
                    <h2 className="mt-2 text-5xl font-black leading-[0.92] text-white xl:text-6xl 2xl:text-7xl">{featured.name}</h2>
                    {featured.description && <p className="mt-3 line-clamp-2 text-xl font-bold leading-tight text-white/68 xl:text-2xl 2xl:text-3xl">{featured.description}</p>}
                  </div>
                  {hasPrice(featured.price) && (
                    <p className="rounded-[26px] bg-[#f5c542] px-6 py-4 text-5xl font-black leading-none text-black shadow-[0_20px_70px_rgba(245,197,66,0.32)] xl:px-8 xl:py-5 xl:text-6xl 2xl:text-7xl">
                      {money(featured.price)}
                    </p>
                  )}
                </div>
              </article>
            )}
          </div>
        )}

        {carouselItems.length > 1 && (
          <div className="mt-3 flex shrink-0 justify-center gap-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActivePage(index)}
                className={`h-2.5 rounded-full transition-all ${index === activePage ? 'w-12 bg-[#f5c542]' : 'w-2.5 bg-white/25'}`}
                aria-label={`Pagina ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
