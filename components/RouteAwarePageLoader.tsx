'use client'

import { useEffect, useMemo, useState } from 'react'
import EccofoodPageLoader from '@/components/EccofoodPageLoader'
import StoreLoadingScreen from '@/components/store/StoreLoadingScreen'

const APP_SECTIONS = new Set([
  'acceso',
  'admin',
  'staff',
  'kitchen',
  'cocina',
  'pantalla',
  'pos-display',
  'kiosko',
])

const ROOT_APP_ROUTES = new Set([
  '',
  'login',
  'register',
  'planes',
  'gestionar-cuentas',
  'owner-dashboard',
  'unauthorized',
])

type StoreBrand = {
  appName: string
  logoUrl: string | null
  primaryColor: string
}

function isTenantSubdomainHost(host: string) {
  if (host === 'localhost' || host === '127.0.0.1') return false
  if (host === 'eccofoodapp.com' || host === 'www.eccofoodapp.com') return false
  if (host === 'eccofood.vercel.app') return false
  return host.endsWith('.eccofoodapp.com') || host.endsWith('.vercel.app')
}

function isCustomDomainHost(host: string) {
  if (host === 'localhost' || host === '127.0.0.1') return false
  if (host === 'eccofoodapp.com' || host === 'www.eccofoodapp.com') return false
  if (host === 'eccofood.vercel.app') return false
  if (host.endsWith('.eccofoodapp.com') || host.endsWith('.vercel.app')) return false
  return host.includes('.')
}

function isStoreRoute(host: string, pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'api' || parts[0] === '_next') return false

  if (isTenantSubdomainHost(host) || isCustomDomainHost(host)) {
    return !APP_SECTIONS.has(parts[0] || '')
  }

  const first = parts[0] || ''
  if (ROOT_APP_ROUTES.has(first) || first.includes('.')) return false
  return !APP_SECTIONS.has(parts[1] || '')
}

function titleFromSlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Restaurante'
}

function getFallbackStoreName(host: string, pathname: string) {
  if (isTenantSubdomainHost(host)) {
    return titleFromSlug(host.split('.')[0] || '')
  }
  if (isCustomDomainHost(host)) {
    return titleFromSlug(host.split('.')[0] || '')
  }
  return titleFromSlug(pathname.split('/').filter(Boolean)[0] || '')
}

export default function RouteAwarePageLoader({
  initialIsStore = false,
  initialFallbackName = 'Restaurante',
  initialLogoUrl = null,
  initialPrimaryColor,
}: {
  initialIsStore?: boolean
  initialFallbackName?: string
  initialLogoUrl?: string | null
  initialPrimaryColor?: string
}) {
  const [storeBrand, setStoreBrand] = useState<StoreBrand | null>(
    initialLogoUrl || initialPrimaryColor
      ? { appName: initialFallbackName, logoUrl: initialLogoUrl, primaryColor: initialPrimaryColor || '#D9A441' }
      : null
  )
  const routeInfo = useMemo(() => {
    if (typeof window === 'undefined') return { isStore: initialIsStore, fallbackName: initialFallbackName }
    const host = window.location.hostname
    const pathname = window.location.pathname
    return {
      isStore: isStoreRoute(host, pathname),
      fallbackName: getFallbackStoreName(host, pathname),
    }
  }, [initialFallbackName, initialIsStore])

  useEffect(() => {
    if (!routeInfo.isStore) return
    try {
      const raw = localStorage.getItem('eccofood:active-store-branding')
      if (raw) setStoreBrand(JSON.parse(raw))
    } catch {}
  }, [routeInfo.isStore])

  if (routeInfo.isStore) {
    const primary = storeBrand?.primaryColor || initialPrimaryColor || 'var(--primary-color, #D9A441)'
    const appName = storeBrand?.appName || routeInfo.fallbackName

    return <StoreLoadingScreen color={primary} logoUrl={storeBrand?.logoUrl || null} appName={appName} />
  }

  return <EccofoodPageLoader />
}
