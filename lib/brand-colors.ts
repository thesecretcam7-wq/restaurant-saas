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

export function colorWithAlpha(color: string, alphaHex: string) {
  return hexToRgb(color) ? `${color}${alphaHex}` : color
}

export function deriveBrandPalette(input: BrandColorInput = {}) {
  const primary = input.primary || '#E4002B'
  const secondary = input.secondary || '#15130f'
  const accent = input.accent || primary
  const background = input.background || '#f8f5ef'
  const surface = input.surface || (isDarkColor(background) ? '#111827' : '#ffffff')
  const neutralSoft = isDarkColor(surface) ? 'rgba(255,255,255,0.08)' : '#f3f4f6'
  const primarySoft = mixHexColors(primary, surface, isDarkColor(surface) ? 0.82 : 0.9)
  const buttonPrimary = input.buttonPrimary || primary
  const buttonSecondary = input.buttonSecondary && input.buttonSecondary.toLowerCase() !== '#ffffff'
    ? input.buttonSecondary
    : neutralSoft

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    cardSurface: isDarkColor(surface) ? '#111827' : '#ffffff',
    neutralSoft,
    primarySoft,
    buttonPrimary,
    buttonPrimaryText: readableTextColor(buttonPrimary),
    buttonSecondary,
    buttonSecondaryText: readableTextColor(buttonSecondary, primary, '#ffffff'),
    text: input.textPrimary || readableTextColor(surface),
    mutedText: input.textSecondary || (isDarkColor(surface) ? 'rgba(255,255,255,0.66)' : 'rgba(21,19,15,0.55)'),
    pageText: input.textPrimary || readableTextColor(background),
    border: input.border || (isDarkColor(surface) ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'),
  }
}
