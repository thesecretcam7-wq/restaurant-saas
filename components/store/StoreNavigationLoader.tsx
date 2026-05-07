'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORE_ROUTE_BLOCKLIST = [
  '/admin',
  '/staff',
  '/kitchen',
  '/cocina',
  '/pantalla',
  '/pos-display',
  '/acceso',
  '/kiosko',
]

function isStorePath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const section = parts[1] ? `/${parts[1]}` : ''
  return !STORE_ROUTE_BLOCKLIST.includes(section)
}

export default function StoreNavigationLoader({ color }: { color?: string }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const currentPathRef = useRef(pathname)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const primary = color || 'var(--primary-color, #E4002B)'

  useEffect(() => {
    currentPathRef.current = pathname
    setLoading(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      if (!isStorePath(window.location.pathname) || !isStorePath(url.pathname)) return

      setLoading(true)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setLoading(false), 8000)
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!loading || !isStorePath(currentPathRef.current)) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9990] flex items-center justify-center bg-[#15130f]/45 px-5 backdrop-blur-[6px]">
      <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/35 bg-white/95 p-5 text-[#15130f] shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-4">
          <div
            className="relative grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-black text-white shadow-xl"
            style={{ backgroundColor: primary }}
            aria-hidden="true"
          >
            <span
              className="absolute inset-0 rounded-2xl"
              style={{
                backgroundColor: primary,
                animation: 'storeLoaderGlow 1.35s ease-in-out infinite',
              }}
            />
            <span className="relative">E</span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">Eccofood</p>
            <p className="mt-1 text-lg font-black leading-tight">Preparando la tienda</p>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: primary,
              animation: 'storeLoaderBar 1.15s ease-in-out infinite',
            }}
          />
        </div>

        <div className="mt-4 grid grid-cols-[68px_minmax(0,1fr)] gap-3" aria-hidden="true">
          <div className="h-16 rounded-2xl bg-black/[0.06]" />
          <div className="space-y-2.5 pt-1">
            <div className="h-3 w-3/4 rounded-full bg-black/[0.10]" />
            <div className="h-3 w-11/12 rounded-full bg-black/[0.07]" />
            <div className="flex items-center gap-1.5 pt-1">
              {[0, 1, 2].map(index => (
                <span
                  key={index}
                  className="block size-2 rounded-full"
                  style={{
                    backgroundColor: primary,
                    animation: 'storeLoadingDot 900ms ease-in-out infinite',
                    animationDelay: `${index * 140}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <span className="sr-only" role="status" aria-live="polite">Cargando tienda</span>
      </div>
    </div>
  )
}
