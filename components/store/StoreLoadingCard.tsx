'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/LanguageSwitcher'

interface StoreLoadingCardProps {
  color?: string
  logoUrl?: string | null
  appName?: string | null
}

interface StoredBranding {
  appName?: string
  logoUrl?: string | null
  primaryColor?: string
}

export default function StoreLoadingCard({ color, logoUrl, appName }: StoreLoadingCardProps) {
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
  const fallbackLetter = storeName.trim().slice(0, 1).toUpperCase() || 'R'

  return (
    <div className="w-full max-w-[430px] overflow-hidden rounded-[32px] border border-[#d9a441]/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035)),rgba(17,16,13,0.94)] p-8 text-[#fff4d8] shadow-[0_30px_100px_rgba(0,0,0,0.48),0_0_70px_rgba(184,92,31,0.20)] backdrop-blur-xl">
      <div className="flex flex-col items-center text-center">
        <div
          className={`relative grid place-items-center text-4xl font-black text-[#080808] ${resolvedLogo ? 'h-32 w-40' : 'size-28 rounded-[30px] shadow-[0_22px_60px_rgba(217,164,65,0.18)]'}`}
          style={resolvedLogo ? undefined : { background: `linear-gradient(135deg, ${primary}, #f2cf82)` }}
          aria-hidden="true"
        >
          {!resolvedLogo && (
            <span
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${primary}, #f2cf82)`,
                animation: 'storeLoaderGlow 1.35s ease-in-out infinite',
              }}
            />
          )}
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

        <p className="mt-6 max-w-full truncate text-lg font-black text-[#fff4d8]">{storeName}</p>
        <div className="mt-7 flex items-center justify-center gap-0.5 text-3xl font-black tracking-wide">
          {tr('common.loading').split('').map((letter, index) => (
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

      <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${primary}, #f2cf82)`,
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
