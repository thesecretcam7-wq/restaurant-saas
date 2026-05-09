'use client'

import { useEffect, useMemo, useState } from 'react'
import EccofoodLogo from '@/components/EccofoodLogo'

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

function isStoreRoute(host: string, pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] === 'api' || parts[0] === '_next') return false

  if (isTenantSubdomainHost(host)) {
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
  return titleFromSlug(pathname.split('/').filter(Boolean)[0] || '')
}

export default function RouteAwarePageLoader() {
  const [storeBrand, setStoreBrand] = useState<StoreBrand | null>(null)
  const routeInfo = useMemo(() => {
    if (typeof window === 'undefined') return { isStore: false, fallbackName: 'Restaurante' }
    const host = window.location.hostname
    const pathname = window.location.pathname
    return {
      isStore: isStoreRoute(host, pathname),
      fallbackName: getFallbackStoreName(host, pathname),
    }
  }, [])

  useEffect(() => {
    if (!routeInfo.isStore) return
    try {
      const raw = localStorage.getItem('eccofood:active-store-branding')
      if (raw) setStoreBrand(JSON.parse(raw))
    } catch {}
  }, [routeInfo.isStore])

  if (routeInfo.isStore) {
    const primary = storeBrand?.primaryColor || 'var(--primary-color, #E4002B)'
    const appName = storeBrand?.appName || routeInfo.fallbackName

    return (
      <main className="grid min-h-screen place-items-center bg-white/70 px-5 text-[#15130f] backdrop-blur-[8px]">
        <section className="w-full max-w-[460px] overflow-hidden rounded-[34px] border border-white/80 bg-white/98 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
          <div
            className="relative mx-auto grid size-28 place-items-center rounded-[30px] text-4xl font-black text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)]"
            style={{ backgroundColor: primary }}
          >
            <span
              className="absolute inset-0 rounded-2xl"
              style={{ backgroundColor: primary, animation: 'storeLoaderGlow 1.35s ease-in-out infinite' }}
            />
            {storeBrand?.logoUrl ? (
              <img src={storeBrand.logoUrl} alt={appName} className="relative h-24 w-24 object-contain drop-shadow-lg" />
            ) : (
              <span className="relative">{appName.charAt(0)}</span>
            )}
          </div>

          <p className="mt-6 text-lg font-black" style={{ color: primary }}>{appName}</p>
          <div className="mt-3 flex items-center justify-center gap-0.5 text-3xl font-black tracking-wide">
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

          <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-black/8">
            <div
              className="h-full rounded-full"
              style={{ backgroundColor: primary, animation: 'storeLoaderBar 1.15s ease-in-out infinite' }}
            />
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5f0] px-5 text-[#17120d]">
      <section className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(17,17,17,0.12)] backdrop-blur">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-[#111111] shadow-[0_20px_50px_rgba(249,115,22,0.24)]">
          <EccofoodLogo size="lg" showText={false} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f97316]">Eccofood</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Cargando Eccofood</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-black/48">Preparando una experiencia rapida y segura.</p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-black/7">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full bg-[#f97316]" />
        </div>
      </section>
    </main>
  )
}
