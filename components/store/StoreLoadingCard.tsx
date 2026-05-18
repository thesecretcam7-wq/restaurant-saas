'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/LanguageSwitcher'

interface StoreLoadingCardProps {
  color?: string
  logoUrl?: string | null
  appName?: string | null
  themeMode?: 'dark' | 'light'
}

interface StoredBranding {
  appName?: string
  logoUrl?: string | null
  primaryColor?: string
  themeMode?: 'dark' | 'light'
}

export default function StoreLoadingCard({ color, logoUrl, appName, themeMode }: StoreLoadingCardProps) {
  const [storedBranding, setStoredBranding] = useState<StoredBranding | null>(null)
  const { tr } = useI18n()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eccofood:active-store-branding')
      if (raw) setStoredBranding(JSON.parse(raw))
    } catch {}
  }, [])

  const primary = color || storedBranding?.primaryColor || 'var(--button-primary-color, var(--primary-color, #15130f))'
  const resolvedLogo = logoUrl || storedBranding?.logoUrl || null
  const storeName = appName || storedBranding?.appName || 'Restaurante'
  const isLight = (themeMode || storedBranding?.themeMode) === 'light'
  const displayName = storeName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase())
  const fallbackLetter = storeName.trim().slice(0, 1).toUpperCase() || 'R'

  return (
    <div className={`w-full max-w-[360px] overflow-hidden rounded-[28px] border p-7 shadow-[0_26px_90px_rgba(0,0,0,0.18)] backdrop-blur-xl ${
      isLight
        ? 'border-orange-200/70 bg-white/92 text-[#1f1308]'
        : 'border-white/10 bg-[#0d0c09]/92 text-[#fff4d8] shadow-[0_26px_90px_rgba(0,0,0,0.42)]'
    }`}>
      <div className="flex flex-col items-center text-center">
        <div
          className={`relative grid place-items-center text-4xl font-black ${resolvedLogo ? 'h-28 w-40' : `size-24 rounded-[26px] border ${isLight ? 'border-orange-200 bg-orange-50 text-[#1f1308]' : 'border-white/10 bg-white/8 text-[#fff4d8]'}`}`}
          style={resolvedLogo ? undefined : { boxShadow: `0 18px 50px color-mix(in srgb, ${primary} 18%, transparent)` }}
          aria-hidden="true"
        >
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt=""
              className="relative h-full w-full object-contain drop-shadow-2xl"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="relative">{fallbackLetter}</span>
          )}
        </div>

        <p className={`mt-5 max-w-full truncate text-xl font-black ${isLight ? 'text-[#1f1308]' : 'text-[#fff4d8]'}`}>{displayName}</p>
        <p className={`mt-2 text-xs font-bold uppercase tracking-[0.22em] ${isLight ? 'text-[#7c3f14]' : 'text-white/45'}`}>
          Preparando tu tienda
        </p>
      </div>

      <div className={`mt-8 h-1.5 overflow-hidden rounded-full ${isLight ? 'bg-orange-100' : 'bg-white/10'}`}>
        <div
          className="h-full rounded-full"
          style={{
            background: primary,
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

      <span className="sr-only" role="status" aria-live="polite">{tr('common.storeLoading')}</span>
    </div>
  )
}
