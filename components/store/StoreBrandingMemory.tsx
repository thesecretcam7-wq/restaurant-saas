'use client'

import { useEffect } from 'react'

export default function StoreBrandingMemory({
  appName,
  logoUrl,
  primaryColor,
}: {
  appName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        'eccofood:active-store-branding',
        JSON.stringify({
          appName: appName || 'Restaurante',
          logoUrl: logoUrl || null,
          primaryColor: primaryColor || '#E4002B',
        })
      )
    } catch {}
  }, [appName, logoUrl, primaryColor])

  return null
}
