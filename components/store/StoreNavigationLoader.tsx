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

export default function StoreNavigationLoader({
  color,
  logoUrl,
}: {
  color?: string
  logoUrl?: string | null
}) {
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
    <div className="pointer-events-none fixed inset-0 z-[9990] flex items-center justify-center bg-white/70 px-5 backdrop-blur-[8px]">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[32px] border border-white/80 bg-white/98 p-8 text-[#15130f] shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col items-center text-center">
          <div
            className="relative grid size-28 place-items-center rounded-[30px] text-4xl font-black text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)]"
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
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="relative h-24 w-24 object-contain drop-shadow-lg"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="relative">E</span>
            )}
          </div>

          <div className="mt-7 flex items-center justify-center gap-0.5 text-3xl font-black tracking-wide">
            {'Cargando'.split('').map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="inline-block"
                style={{
                  color: primary,
                  animation: 'storeLoadingText 1.15s ease-in-out infinite',
                  animationDelay: `${index * 65}ms`,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: primary,
              animation: 'storeLoaderBar 1.15s ease-in-out infinite',
            }}
          />
        </div>

        <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map(index => (
            <span
              key={index}
              className="block size-2.5 rounded-full"
              style={{
                backgroundColor: primary,
                animation: 'storeLoadingDot 900ms ease-in-out infinite',
                animationDelay: `${index * 140}ms`,
              }}
            />
          ))}
        </div>

        <span className="sr-only" role="status" aria-live="polite">Cargando tienda</span>
      </div>
    </div>
  )
}
