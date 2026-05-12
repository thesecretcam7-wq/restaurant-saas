'use client'

import { ReactNode } from 'react'

interface KioskoBrandingProviderProps {
  branding: {
    appName: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    buttonPrimaryColor: string
    buttonSecondaryColor: string
    textPrimaryColor: string
    textSecondaryColor: string
    borderColor: string
    logoUrl: string | null
  }
  children: ReactNode
}

/**
 * Injects kiosko branding colors as CSS variables into a scoped container.
 * Enables dynamic theming based on tenant branding colors.
 * All CSS variables use --kiosko- prefix to avoid conflicts with admin theming.
 */
export default function KioskoBrandingProvider({
  branding,
  children,
}: KioskoBrandingProviderProps) {
  // Helper to determine if a hex color is dark
  function hexToRgb(hex: string) {
    const normalized = hex.replace('#', '').trim()
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    }
  }

  function isDark(hex: string): boolean {
    const rgb = hexToRgb(hex)
    if (!rgb) return true
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
    return luminance < 0.5
  }

  // Calculate derived colors for text contrast
  const primaryTextColor = isDark(branding.primaryColor) ? '#ffffff' : '#15130f'
  const buttonTextColor = isDark(branding.buttonPrimaryColor) ? '#ffffff' : '#15130f'
  const secondaryButtonTextColor = isDark(branding.buttonSecondaryColor) ? '#ffffff' : '#15130f'
  const surfaceColor = isDark(branding.backgroundColor) ? branding.secondaryColor : '#ffffff'
  const surfaceTextColor = isDark(surfaceColor) ? '#ffffff' : '#15130f'

  // CSS variables object for the scoped container
  const cssVariables = {
    '--kiosko-primary': branding.primaryColor,
    '--kiosko-secondary': branding.secondaryColor,
    '--kiosko-accent': branding.accentColor,
    '--kiosko-background': branding.backgroundColor,
    '--kiosko-button-primary': branding.buttonPrimaryColor,
    '--kiosko-button-secondary': branding.buttonSecondaryColor,
    '--kiosko-text-primary': branding.textPrimaryColor,
    '--kiosko-text-secondary': branding.textSecondaryColor,
    '--kiosko-border': branding.borderColor,

    // Derived text colors for contrast
    '--kiosko-text-on-primary': primaryTextColor,
    '--kiosko-text-on-button': buttonTextColor,
    '--kiosko-text-on-button-secondary': secondaryButtonTextColor,

    // Surface color (inverts based on background darkness)
    '--kiosko-surface': surfaceColor,
    '--kiosko-surface-text': surfaceTextColor,
  } as React.CSSProperties

  return (
    <div style={cssVariables} className="w-full h-full">
      {children}
    </div>
  )
}
