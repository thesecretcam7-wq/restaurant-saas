const COUNTRY_TIMEZONE: Record<string, string> = {
  CO: 'America/Bogota',
  ES: 'Europe/Madrid',
  MX: 'America/Mexico_City',
  US: 'America/New_York',
  AR: 'America/Buenos_Aires',
  PE: 'America/Bogota',
  CL: 'America/Santiago',
}

const COUNTRY_LOCALE: Record<string, string> = {
  CO: 'es-CO',
  ES: 'es-ES',
  MX: 'es-MX',
  US: 'en-US',
  AR: 'es-AR',
  PE: 'es-PE',
  CL: 'es-CL',
}

function normalizeCountry(country?: string | null) {
  return String(country || 'CO').trim().toUpperCase()
}

export function getRestaurantLocale(country?: string | null) {
  return COUNTRY_LOCALE[normalizeCountry(country)] || 'es-CO'
}

export function getRestaurantTimeZone(args: {
  timezone?: string | null
  settingsCountry?: string | null
  tenantCountry?: string | null
} = {}) {
  const explicitTimezone = String(args.timezone || '').trim()
  if (explicitTimezone) return explicitTimezone

  const country = normalizeCountry(args.settingsCountry || args.tenantCountry)
  return COUNTRY_TIMEZONE[country] || 'America/Bogota'
}

export function formatRestaurantDateTime(
  value: string | number | Date,
  args: Intl.DateTimeFormatOptions & {
    locale?: string
    timeZone?: string
  } = {}
) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const { locale = 'es-CO', timeZone = 'America/Bogota', ...options } = args
  return date.toLocaleString(locale, {
    timeZone,
    ...options,
  })
}
