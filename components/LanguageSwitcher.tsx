'use client'

import { useEffect, useMemo, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { localeLabels, normalizeLocale, SUPPORTED_LOCALES, translate, type Locale, type TranslationKey } from '@/lib/i18n'

const STORAGE_KEY = 'eccofood:locale'
const COOKIE_KEY = 'eccofood_locale'

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'es'

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) return normalizeLocale(saved)
  } catch {}

  const cookie = document.cookie
    .split('; ')
    .find(item => item.startsWith(`${COOKIE_KEY}=`))
    ?.split('=')[1]

  return normalizeLocale(cookie || window.navigator.language)
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {}

  document.cookie = `${COOKIE_KEY}=${locale}; path=/; max-age=31536000; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('eccofood:locale-change', { detail: locale }))
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>('es')

  useEffect(() => {
    setLocaleState(readInitialLocale())
  }, [])

  useEffect(() => {
    const onStorage = () => setLocaleState(readInitialLocale())
    const onLocale = (event: Event) => {
      const custom = event as CustomEvent<Locale>
      setLocaleState(normalizeLocale(custom.detail))
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('eccofood:locale-change', onLocale)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('eccofood:locale-change', onLocale)
    }
  }, [])

  return useMemo(() => {
    const setLocale = (nextLocale: Locale) => {
      setLocaleState(nextLocale)
      persistLocale(nextLocale)
    }

    return {
      locale,
      setLocale,
      tr: (key: TranslationKey) => translate(locale, key),
    }
  }, [locale])
}

interface LanguageSwitcherProps {
  className?: string
  reloadOnChange?: boolean
  compact?: boolean
}

export default function LanguageSwitcher({ className = '', reloadOnChange = false, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, tr } = useI18n()

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-black text-[#171717] shadow-sm backdrop-blur-xl transition hover:border-black/20 ${className}`}
    >
      <Globe2 className="size-4 text-[#ff6b1a]" aria-hidden="true" />
      <span className={compact ? 'sr-only' : 'hidden sm:inline'}>{tr('language.select')}</span>
      <select
        value={locale}
        aria-label={tr('language.select')}
        onChange={(event) => {
          const nextLocale = normalizeLocale(event.target.value)
          setLocale(nextLocale)
          if (reloadOnChange) window.location.reload()
        }}
        className="bg-transparent text-xs font-black outline-none"
      >
        {SUPPORTED_LOCALES.map(item => (
          <option key={item} value={item} className="bg-white text-slate-950">
            {compact ? item.toUpperCase() : localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  )
}
