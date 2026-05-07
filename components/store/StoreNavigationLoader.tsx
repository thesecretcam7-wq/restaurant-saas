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
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[70] flex justify-center px-4 sm:bottom-6">
      <div className="flex min-h-12 items-center gap-3 rounded-full border border-black/10 bg-white/95 px-5 py-3 text-sm font-black text-[#15130f] shadow-2xl shadow-black/15 backdrop-blur-xl">
        <span>Cargando</span>
        <span className="flex h-5 items-center gap-1" aria-hidden="true">
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
        </span>
        <span className="sr-only" role="status" aria-live="polite">Cargando pagina</span>
      </div>
    </div>
  )
}
