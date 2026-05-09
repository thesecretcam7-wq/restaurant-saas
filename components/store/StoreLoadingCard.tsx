'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/components/LanguageSwitcher'

interface StoreLoadingCardProps {
  color?: string
  logoUrl?: string | null
}

interface StoredBranding {
  appName?: string
  logoUrl?: string | null
  primaryColor?: string
}

export default function StoreLoadingCard({ color, logoUrl }: StoreLoadingCardProps) {
  const [storedBranding, setStoredBranding] = useState<StoredBranding | null>(null)
  const { tr } = useI18n()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eccofood:active-store-branding')
      if (raw) setStoredBranding(JSON.parse(raw))
    } catch {}
  }, [])

  const primary = color || storedBranding?.primaryColor || 'var(--primary-color, #E4002B)'
  const resolvedLogo = logoUrl || storedBranding?.logoUrl || null
  const fallbackLetter = (storedBranding?.appName || 'Restaurante').trim().slice(0, 1).toUpperCase() || 'R'

  return (
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
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt=""
              className="relative h-24 w-24 object-contain drop-shadow-lg"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="relative">{fallbackLetter}</span>
          )}
        </div>

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

      <span className="sr-only" role="status" aria-live="polite">{tr('common.storeLoading')}</span>
    </div>
  )
}
