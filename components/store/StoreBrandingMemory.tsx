'use client'

import { useEffect } from 'react'

export default function StoreBrandingMemory({
  appName,
  logoUrl,
  primaryColor,
  themeMode,
}: {
  appName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  themeMode?: 'dark' | 'light'
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        'eccofood:active-store-branding',
        JSON.stringify({
          appName: appName || 'Restaurante',
          logoUrl: logoUrl || null,
          primaryColor: primaryColor || '#15130f',
          themeMode: themeMode || 'dark',
        })
      )
    } catch {}
  }, [appName, logoUrl, primaryColor, themeMode])

  return null
}
