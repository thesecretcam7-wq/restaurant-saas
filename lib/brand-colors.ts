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
  primary: '#15130f',
  secondary: '#111827',
  accent: '#15130f',
  background: '#f8f5ef',
  surface: '#ffffff',
  buttonPrimary: '#15130f',
  buttonSecondary: '#f3f4f6',
  textPrimary: '#15130f',
  textSecondary: MUTED_INK,
  border: '#e7dfd6',
}

export function deriveBrandPalette(input: BrandColorInput = {}) {
  const primary = normalizeHexColor(input.primary, DEFAULT_BRAND_COLORS.primary)
  const secondary = normalizeHexColor(
    input.secondary,
    mixHexColors(primary, '#000000', isDarkColor(primary) ? 0.24 : 0.34)
  )
  const accent = normalizeHexColor(input.accent, input.buttonPrimary || primary)
  const buttonPrimary = normalizeHexColor(input.buttonPrimary, accent || primary)
  const background = input.background && hexToRgb(input.background)
    ? input.background
    : isDarkColor(primary)
    ? mixHexColors(primary, WHITE, 0.93)
    : mixHexColors(primary, WHITE, 0.9)
  const surface = normalizeHexColor(input.surface, WHITE)
  const cardSurface = getStoreCardSurface(surface)
  const neutralSoft = mixHexColors(primary, WHITE, 0.93)
  const primarySoft = mixHexColors(primary, WHITE, 0.9)
  const buttonSecondary = normalizeHexColor(input.buttonSecondary, mixHexColors(buttonPrimary, WHITE, 0.88))
  const text = normalizeHexColor(input.textPrimary, INK)
  const mutedText = normalizeHexColor(input.textSecondary, MUTED_INK)
  const border = normalizeHexColor(input.border, mixHexColors(primary, WHITE, 0.78))

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
