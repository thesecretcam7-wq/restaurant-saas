'use client'

import { useEffect, useMemo, useState } from 'react'

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

export function TVMenuScreen({ restaurantName, logoUrl, items }: TVMenuScreenProps) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const tick = window.setInterval(() => setTime(new Date()), 1000)
    const reload = window.setInterval(() => window.location.reload(), 90_000)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(reload)
    }
  }, [])

  const featured = items.find((item) => item.featured) || items[0]
  const grouped = useMemo(() => {
    const map = new Map<string, TVMenuItem[]>()
    for (const item of items.filter((row) => row.id !== featured?.id)) {
      map.set(item.category || 'Menu del dia', [...(map.get(item.category || 'Menu del dia') || []), item])
    }
    return Array.from(map.entries()).slice(0, 4)
  }, [featured?.id, items])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090a0d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(245,197,66,0.18),transparent_30%),radial-gradient(circle_at_82%_0%,rgba(228,61,48,0.2),transparent_32%),linear-gradient(135deg,#090a0d_0%,#18110d_54%,#090a0d_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#e43d30]/18 to-transparent" />

      <section className="relative z-10 flex min-h-screen flex-col p-8 xl:p-10">
        <header className="flex items-center justify-between gap-8">
          <div className="flex min-w-0 items-center gap-6">
            {logoUrl ? (
              <div className="flex h-24 w-32 items-center justify-center rounded-[28px] border border-white/10 bg-white p-3 shadow-[0_22px_80px_rgba(0,0,0,0.45)]">
                <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <DefaultLogo name={restaurantName} />
            )}
            <div className="min-w-0">
              <p className="text-2xl font-black uppercase tracking-[0.25em] text-[#f5c542]">Menu diario</p>
              <h1 className="truncate text-6xl font-black leading-none text-white xl:text-7xl">{restaurantName}</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-black tabular-nums text-white">{time ? time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
            <p className="mt-2 text-xl font-bold capitalize text-white/55">{time ? time.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }) : ''}</p>
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
          <div className="grid flex-1 gap-8 pt-8 xl:grid-cols-[1.08fr_1fr]">
            {featured && (
              <article className="relative overflow-hidden rounded-[40px] border border-[#f5c542]/30 bg-[#15171f] shadow-[0_28px_90px_rgba(0,0,0,0.42)]">
                {featured.image_url ? (
                  <img src={featured.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a10] to-[#111827]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/42 to-black/5" />
                <div className="relative flex h-full min-h-[620px] flex-col justify-end p-8">
                  <div className="mb-auto flex justify-between gap-4">
                    <span className="rounded-full bg-[#e43d30] px-6 py-3 text-2xl font-black uppercase text-white shadow-xl">Especial</span>
                    {featured.badge && <span className="rounded-full bg-[#f5c542] px-6 py-3 text-2xl font-black uppercase text-black shadow-xl">{featured.badge}</span>}
                  </div>
                  <p className="text-8xl font-black leading-none text-white drop-shadow-2xl">{featured.name}</p>
                  {featured.description && <p className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white/82">{featured.description}</p>}
                  <p className="mt-8 inline-flex w-fit rounded-[28px] bg-[#f5c542] px-8 py-4 text-7xl font-black leading-none text-black shadow-[0_20px_70px_rgba(245,197,66,0.35)]">
                    {money(featured.price)}
                  </p>
                </div>
              </article>
            )}

            <div className="grid content-start gap-5">
              {grouped.map(([category, categoryItems]) => (
                <section key={category} className="rounded-[30px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-3xl font-black uppercase tracking-[0.08em] text-[#f5c542]">{category}</h2>
                    <span className="rounded-full bg-white/10 px-4 py-1 text-lg font-black text-white/60">{categoryItems.length}</span>
                  </div>
                  <div className="grid gap-4">
                    {categoryItems.slice(0, 4).map((item) => (
                      <article key={item.id} className="grid grid-cols-[128px_1fr_auto] items-center gap-5 rounded-[24px] bg-black/34 p-3">
                        <div className="h-28 overflow-hidden rounded-[20px] bg-[#15171f]">
                          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl font-black text-white/20">TV</div>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="truncate text-3xl font-black leading-tight text-white">{item.name}</p>
                            {item.badge && <span className="rounded-full bg-[#e43d30] px-3 py-1 text-sm font-black uppercase text-white">{item.badge}</span>}
                          </div>
                          {item.description && <p className="mt-1 line-clamp-2 text-xl font-bold leading-tight text-white/55">{item.description}</p>}
                        </div>
                        <p className="rounded-2xl bg-white px-5 py-3 text-4xl font-black text-black">{money(item.price)}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
