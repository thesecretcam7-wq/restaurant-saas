export type BrandColorInput = {
  primary?: string | null
  secondary?: string | null
  accent?: string | null
  background?: string | null
  surface?: string | null
  buttonPrimary?: string | null
  buttonSecondary?: string | null
  textPrimary?: string | null
  textSecondary?: string | null
  border?: string | null
}

const WHITE = '#ffffff'
const INK = '#15130f'
const MUTED_INK = '#6b6258'

export function hexToRgb(hex?: string | null) {
  if (!hex) return null
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

export function isDarkColor(color?: string | null) {
  const rgb = hexToRgb(color)
  if (!rgb) return false
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 < 0.55
}

export function readableTextColor(background?: string | null, dark = '#15130f', light = '#ffffff') {
  return isDarkColor(background) ? light : dark
}

export function isVividBrandColor(color?: string | null) {
  const rgb = hexToRgb(color)
  if (!rgb) return false
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255
  const lightness = (max + min) / 2
  const delta = max - min
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))

  return saturation > 0.32 && lightness > 0.18 && lightness < 0.82
}

export function getStoreCardSurface(surface?: string | null) {
  if (!surface) return '#ffffff'
  if (isDarkColor(surface) || isVividBrandColor(surface)) return '#ffffff'
  return surface
}

export function mixHexColors(from?: string | null, to?: string | null, amount = 0.5) {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  if (!a || !b) return to || from || '#ffffff'
  const ratio = Math.min(Math.max(amount, 0), 1)
  const channel = (start: number, end: number) => Math.round(start + (end - start) * ratio)
  return `#${[channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')}`
}

export function normalizeHexColor(color?: string | null, fallback = INK) {
  return hexToRgb(color) ? color! : fallback
}

export function colorWithAlpha(color: string, alphaHex: string) {
  return hexToRgb(color) ? `${color}${alphaHex}` : color
}

export const DEFAULT_BRAND_COLORS = {
  primary: '#050403',
  secondary: '#12100C',
  accent: '#D9A441',
  background: '#040404',
  surface: '#11100D',
  buttonPrimary: '#D9A441',
  buttonSecondary: '#1B1710',
  textPrimary: '#FFF4D8',
  textSecondary: '#B9A989',
  border: '#4A3515',
}

export function deriveBrandPalette(_input: BrandColorInput = {}) {
  // Eccofood owns the UI palette. Restaurants can customize identity assets
  // (logo, name, hero images), but arbitrary client colors made shared flows
  // inconsistent and often broke contrast. Keep this palette stable everywhere.
  const primary = DEFAULT_BRAND_COLORS.primary
  const secondary = DEFAULT_BRAND_COLORS.secondary
  const accent = DEFAULT_BRAND_COLORS.accent
  const buttonPrimary = DEFAULT_BRAND_COLORS.buttonPrimary
  const background = DEFAULT_BRAND_COLORS.background
  const surface = DEFAULT_BRAND_COLORS.surface
  const cardSurface = '#17130D'
  const neutralSoft = '#211A10'
  const primarySoft = '#31230F'
  const buttonSecondary = DEFAULT_BRAND_COLORS.buttonSecondary
  const text = DEFAULT_BRAND_COLORS.textPrimary
  const mutedText = DEFAULT_BRAND_COLORS.textSecondary
  const border = DEFAULT_BRAND_COLORS.border

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    cardSurface,
    neutralSoft,
    primarySoft,
    buttonPrimary,
    buttonPrimaryText: readableTextColor(buttonPrimary),
    buttonSecondary,
    buttonSecondaryText: readableTextColor(buttonSecondary, primary, '#ffffff'),
    text,
    mutedText,
    pageText: text,
    border,
  }
}

export function getLockedTenantBrandingColors() {
  const palette = deriveBrandPalette()

  return {
    primary_color: palette.primary,
    secondary_color: palette.secondary,
    accent_color: palette.accent,
    background_color: palette.background,
    button_primary_color: palette.buttonPrimary,
    button_secondary_color: palette.buttonSecondary,
    text_primary_color: palette.text,
    text_secondary_color: palette.mutedText,
    border_color: palette.border,
    section_background_color: palette.surface,
    gradient_start_color: palette.background,
    gradient_end_color: palette.surface,
    use_gradient: false,
  }
}
