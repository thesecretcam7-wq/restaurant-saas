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

export function TVMenuScreen({ tenantId, restaurantName, logoUrl, items }: TVMenuScreenProps) {
  const [time, setTime] = useState<Date | null>(null)
  const [displayItems, setDisplayItems] = useState(items)
  const [activePage, setActivePage] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const pages = useMemo(() => chunkItems(displayItems, 7), [displayItems])
  const currentPage = pages[activePage] || pages[0] || []
  const featured = currentPage.find((item) => item.featured) || currentPage[0] || displayItems.find((item) => item.featured) || displayItems[0]
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

      <section className="relative z-10 flex h-screen min-h-0 flex-col p-4 sm:p-6 xl:p-8">
        <header className="flex shrink-0 items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-6">
            {logoUrl ? (
              <div className="flex h-24 w-32 items-center justify-center xl:h-32 xl:w-40">
                <img src={logoUrl} alt={restaurantName} className="max-h-full max-w-full object-contain drop-shadow-[0_18px_45px_rgba(0,0,0,0.55)]" />
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

        {displayItems.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <p className="text-7xl font-black text-[#f5c542]">MENU TV</p>
              <p className="mt-5 text-3xl font-bold text-white/60">Agrega productos desde el panel admin.</p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 pt-5 xl:grid-cols-[minmax(0,1.14fr)_minmax(390px,0.86fr)] xl:gap-7 xl:pt-7">
            {featured && (
              <article className="grid min-h-0 overflow-hidden rounded-[28px] border border-white/18 bg-white/[0.08] shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl xl:grid-rows-[minmax(0,1fr)_auto] xl:rounded-[34px]">
                <div className="relative min-h-0 overflow-hidden bg-[#f4f0e8]">
                  {featured.image_url ? (
                    <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full object-contain" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a10] to-[#111827]" />
                  )}
                  <div className="absolute left-5 top-5 flex gap-3">
                    <span className="rounded-full bg-[#e43d30] px-5 py-2 text-lg font-black uppercase text-white shadow-xl xl:text-xl">Especial</span>
                    {featured.badge && <span className="rounded-full bg-[#f5c542] px-5 py-2 text-lg font-black uppercase text-black shadow-xl xl:text-xl">{featured.badge}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-end justify-between gap-5 border-t border-white/14 bg-[#17171d]/92 p-5 xl:p-7">
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f5c542]">{featured.category || 'Menu del dia'}</p>
                    <h2 className="mt-1 text-5xl font-black leading-none text-white xl:text-6xl 2xl:text-7xl">{featured.name}</h2>
                    {featured.description && <p className="mt-3 line-clamp-2 max-w-4xl text-xl font-bold leading-tight text-white/68 xl:text-2xl">{featured.description}</p>}
                  </div>
                  <p className="shrink-0 rounded-[24px] bg-[#f5c542] px-7 py-4 text-5xl font-black leading-none text-black shadow-[0_20px_70px_rgba(245,197,66,0.32)] xl:text-6xl">
                    {money(featured.price)}
                  </p>
                </div>
              </article>
            )}

            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
              <section className="rounded-[26px] border border-white/14 bg-[#f5c542] p-5 text-black shadow-[0_18px_70px_rgba(245,197,66,0.22)]">
                <p className="text-base font-black uppercase tracking-[0.2em] opacity-70">Menu diario</p>
                <p className="mt-1 text-4xl font-black leading-none xl:text-5xl">{featured?.category || 'Especial del dia'}</p>
                <p className="mt-3 text-lg font-black opacity-75">{sideItems.length ? `${sideItems.length} opciones mas en pantalla` : 'Producto destacado'}</p>
              </section>

              <section className="min-h-0 overflow-hidden rounded-[26px] border border-white/14 bg-white/[0.08] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-black uppercase tracking-[0.12em] text-white xl:text-3xl">Mas platos</h3>
                  {pages.length > 1 && <span className="rounded-full bg-white/12 px-4 py-1 text-base font-black text-white/70">{activePage + 1}/{pages.length}</span>}
                </div>

                {sideItems.length === 0 ? (
                  <div className="grid h-full place-items-center rounded-[22px] border border-white/10 bg-black/18 text-center">
                    <p className="px-8 text-3xl font-black text-white/55">Agrega mas productos para que roten en la TV.</p>
                  </div>
                ) : (
                  <div className="grid max-h-full gap-4 overflow-hidden">
                    {sideItems.slice(0, 4).map((item) => (
                      <article key={item.id} className="grid min-h-[116px] grid-cols-[150px_1fr_auto] items-center gap-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#17171d]/82 p-3 xl:min-h-[132px] xl:grid-cols-[178px_1fr_auto]">
                        <div className="h-24 overflow-hidden rounded-[20px] bg-[#f4f0e8] xl:h-28">
                          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-3xl font-black text-black/20">TV</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c542]">{item.category || 'Menu del dia'}</p>
                          <p className="truncate text-3xl font-black leading-tight text-white xl:text-4xl">{item.name}</p>
                          {item.description && <p className="mt-1 line-clamp-1 text-lg font-bold leading-tight text-white/58 xl:text-xl">{item.description}</p>}
                        </div>
                        <p className="rounded-[20px] bg-white px-5 py-3 text-3xl font-black text-black xl:text-4xl">{money(item.price)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
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
