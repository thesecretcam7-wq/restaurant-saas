'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import StoreLoadingScreen from './StoreLoadingScreen'

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

  useEffect(() => {
    currentPathRef.current = pathname
    setLoading(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [pathname])

  useEffect(() => {
    const showLoader = () => {
      setLoading(true)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setLoading(false), 8000)
    }

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

      showLoader()
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('store:navigation-start', showLoader)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('store:navigation-start', showLoader)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!loading || !isStorePath(currentPathRef.current)) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9990]">
      <StoreLoadingScreen color={color} logoUrl={logoUrl} />
    </div>
  )
}
