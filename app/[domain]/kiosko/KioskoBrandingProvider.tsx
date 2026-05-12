'use client'

import React from 'react'

interface KioskoBrandingProviderProps {
  branding: {
    appName: string
    primaryColor: string
    logoUrl: string | null
  }
  children: React.ReactNode
}

/**
 * Injects CSS variables for kiosko branding.
 * Calculates derived colors (text, hover, surface) based on primary color brightness.
 */
export default function KioskoBrandingProvider({
  branding,
  children,
}: KioskoBrandingProviderProps) {
  function isDark(hex: string): boolean {
    const rgb = hexToRgb(hex)
    if (!rgb) return false
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
    return luminance < 0.5
  }

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  // Determine text color based on primary color brightness
  const primaryTextColor = isDark(branding.primaryColor) ? '#ffffff' : '#15130f'
  const primaryBgColor = isDark(branding.primaryColor) ? '#15130f' : '#ffffff'

  // Create accent by lightening/darkening primary slightly
  const accentColor = isDark(branding.primaryColor)
    ? lighten(branding.primaryColor, 20)
    : darken(branding.primaryColor, 20)

  const cssVariables = {
    '--kiosko-primary': branding.primaryColor,
    '--kiosko-primary-light': lighten(branding.primaryColor, 15),
    '--kiosko-primary-dark': darken(branding.primaryColor, 15),
    '--kiosko-accent': accentColor,
    '--kiosko-text-on-primary': primaryTextColor,
    '--kiosko-surface': primaryBgColor,
    '--kiosko-surface-text': isDark(primaryBgColor) ? '#ffffff' : '#15130f',
    '--kiosko-bg': isDark(branding.primaryColor) ? '#0f0e0c' : '#fafaf8',
    '--kiosko-border': isDark(branding.primaryColor) ? '#2a2925' : '#e5e3df',
    '--kiosko-text-primary': '#15130f',
    '--kiosko-text-secondary': '#7a7470',
  } as React.CSSProperties

  return (
    <div style={cssVariables} className="w-full h-full">
      {children}
    </div>
  )
}

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = Math.min(255, (num >> 16) + amount)
  let g = Math.min(255, ((num >> 8) & 0xff) + amount)
  let b = Math.min(255, (num & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = Math.max(0, (num >> 16) - amount)
  let g = Math.max(0, ((num >> 8) & 0xff) - amount)
  let b = Math.max(0, (num & 0xff) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
