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

function DefaultLogo({ name }: { name: string }) {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#f5c542]/35 bg-black shadow-[0_22px_80px_rgba(245,197,66,0.24)]">
      <div className="text-center">
        <p className="text-4xl font-black leading-none text-[#f5c542]">{name.charAt(0).toUpperCase()}</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Menu</p>
      </div>
    </div>
  )
}

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener?: (event: 'release', cb: () => void) => void
}

function chunkItems(items: TVMenuItem[], size: number) {
  const chunks: TVMenuItem[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks.length ? chunks : [[]]
}

export function TVMenuScreen({ restaurantName, logoUrl, items }: TVMenuScreenProps) {
  const [time, setTime] = useState<Date | null>(null)
  const [activePage, setActivePage] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const pages = useMemo(() => chunkItems(items, 7), [items])
  const currentPage = pages[activePage] || pages[0] || []
  const featured = currentPage.find((item) => item.featured) || currentPage[0] || items.find((item) => item.featured) || items[0]
  const sideItems = currentPage.filter((item) => item.id !== featured?.id).slice(0, 6)

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
  }, [items.length])

  useEffect(() => {
    if (pages.length <= 1) return
    const pageTick = window.setInterval(() => {
      setActivePage((page) => (page + 1) % pages.length)
    }, 12_000)
    return () => window.clearInterval(pageTick)
  }, [pages.length])

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

  const grouped = useMemo(() => {
    const map = new Map<string, TVMenuItem[]>()
    for (const item of sideItems) {
      map.set(item.category || 'Menu del dia', [...(map.get(item.category || 'Menu del dia') || []), item])
    }
    return Array.from(map.entries())
  }, [sideItems])

  return (
    <main className="relative h-screen overflow-hidden bg-[#090a0d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(245,197,66,0.18),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(228,61,48,0.2),transparent_32%),linear-gradient(135deg,#090a0d_0%,#18110d_54%,#090a0d_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#e43d30]/18 to-transparent" />

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

      <section className="relative z-10 flex h-screen min-h-0 flex-col p-4 sm:p-6 xl:p-8">
        <header className="flex shrink-0 items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-6">
            {logoUrl ? (
              <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 shadow-[0_22px_80px_rgba(0,0,0,0.45)] xl:h-20 xl:w-28">
                <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <DefaultLogo name={restaurantName} />
            )}
            <div className="min-w-0">
              <p className="text-base font-black uppercase tracking-[0.25em] text-[#f5c542] xl:text-xl">Menu diario</p>
              <h1 className="truncate text-4xl font-black leading-none text-white xl:text-6xl">{restaurantName}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
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
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <p className="text-7xl font-black text-[#f5c542]">MENU TV</p>
              <p className="mt-5 text-3xl font-bold text-white/60">Agrega productos desde el panel admin.</p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 pt-5 xl:grid-cols-[1.05fr_1fr] xl:gap-7 xl:pt-7">
            {featured && (
              <article className="relative min-h-0 overflow-hidden rounded-[28px] border border-[#f5c542]/30 bg-[#15171f] shadow-[0_28px_90px_rgba(0,0,0,0.42)] xl:rounded-[36px]">
                {featured.image_url ? (
                  <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a10] to-[#111827]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-black/5" />
                <div className="relative flex h-full min-h-0 flex-col justify-end p-5 xl:p-8">
                  <div className="mb-auto flex justify-between gap-4">
                    <span className="rounded-full bg-[#e43d30] px-4 py-2 text-lg font-black uppercase text-white shadow-xl xl:px-6 xl:py-3 xl:text-2xl">Especial</span>
                    {featured.badge && <span className="rounded-full bg-[#f5c542] px-4 py-2 text-lg font-black uppercase text-black shadow-xl xl:px-6 xl:py-3 xl:text-2xl">{featured.badge}</span>}
                  </div>
                  <p className="text-5xl font-black leading-none text-white drop-shadow-2xl xl:text-7xl 2xl:text-8xl">{featured.name}</p>
                  {featured.description && <p className="mt-3 line-clamp-2 max-w-3xl text-xl font-bold leading-tight text-white/82 xl:mt-5 xl:text-3xl">{featured.description}</p>}
                  <p className="mt-5 inline-flex w-fit rounded-[24px] bg-[#f5c542] px-6 py-3 text-5xl font-black leading-none text-black shadow-[0_20px_70px_rgba(245,197,66,0.35)] xl:mt-8 xl:px-8 xl:py-4 xl:text-7xl">
                    {money(featured.price)}
                  </p>
                </div>
              </article>
            )}

            <div className="grid min-h-0 content-start gap-3 overflow-hidden xl:gap-4">
              {grouped.map(([category, categoryItems]) => (
                <section key={category} className="rounded-[24px] border border-white/10 bg-white/[0.06] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur xl:p-4">
                  <div className="mb-2 flex items-center justify-between xl:mb-3">
                    <h2 className="truncate text-2xl font-black uppercase tracking-[0.08em] text-[#f5c542] xl:text-3xl">{category}</h2>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white/60 xl:text-base">{categoryItems.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {categoryItems.map((item) => (
                      <article key={item.id} className="grid min-h-[88px] grid-cols-[96px_1fr_auto] items-center gap-3 rounded-[20px] bg-black/34 p-2 xl:min-h-[112px] xl:grid-cols-[128px_1fr_auto] xl:gap-5 xl:p-3">
                        <div className="h-20 overflow-hidden rounded-2xl bg-[#15171f] xl:h-28 xl:rounded-[20px]">
                          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-black text-white/20">TV</div>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="truncate text-2xl font-black leading-tight text-white xl:text-3xl">{item.name}</p>
                            {item.badge && <span className="rounded-full bg-[#e43d30] px-3 py-1 text-sm font-black uppercase text-white">{item.badge}</span>}
                          </div>
                          {item.description && <p className="mt-1 line-clamp-1 text-base font-bold leading-tight text-white/55 xl:line-clamp-2 xl:text-xl">{item.description}</p>}
                        </div>
                        <p className="rounded-2xl bg-white px-4 py-2 text-3xl font-black text-black xl:px-5 xl:py-3 xl:text-4xl">{money(item.price)}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {pages.length > 1 && (
          <div className="mt-3 flex shrink-0 justify-center gap-2">
            {pages.map((_, index) => (
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
