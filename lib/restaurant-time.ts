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

export const DEFAULT_OPERATIONAL_CLOSE_MINUTES = 5 * 60

export type RestaurantBusinessPeriod = {
  periodStart: string
  periodEnd: string
  businessDateLabel: string
  operationalCloseTime: string
}

function normalizeCountry(country?: string | null) {
  return String(country || 'CO').trim().toUpperCase()
}

function parseTimeToMinutes(value?: string | null) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values: Record<string, number> = {}
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  })
  return values as { year: number; month: number; day: number; hour: number; minute: number; second: number }
}

function formatLocalDateKey(parts: { year: number; month: number; day: number }) {
  return [
    parts.year.toString().padStart(4, '0'),
    parts.month.toString().padStart(2, '0'),
    parts.day.toString().padStart(2, '0'),
  ].join('-')
}

function parseLocalDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null

  const [, year, month, day] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }
}

export function getRestaurantLocalDateKey(value: string | number | Date, timeZone = 'America/Bogota') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatLocalDateKey(getZonedParts(date, timeZone))
}

export function addRestaurantLocalDays(dateKey: string, days: number) {
  const parts = parseLocalDateKey(dateKey)
  if (!parts) return dateKey

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0))
  date.setUTCDate(date.getUTCDate() + days)
  return formatLocalDateKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

export function getRestaurantLocalDateStartUtc(dateKey: string, timeZone = 'America/Bogota') {
  const parts = parseLocalDateKey(dateKey)
  if (!parts) return null

  return zonedLocalToUtc(
    {
      ...parts,
      hour: 0,
      minute: 0,
    },
    timeZone
  )
}

function zonedLocalToUtc(
  value: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0))
  const actualParts = getZonedParts(utcGuess, timeZone)
  const desiredAsUtc = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0)
  const actualAsUtc = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second || 0,
    0
  )
  return new Date(utcGuess.getTime() + (desiredAsUtc - actualAsUtc))
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

export function findOperationalCloseMinutes(operatingHours: any) {
  const overnightCloseMinutes: number[] = []

  Object.values(operatingHours || {}).forEach((day: any) => {
    Object.values(day || {}).forEach((shift: any) => {
      const open = parseTimeToMinutes(shift?.open)
      const close = parseTimeToMinutes(shift?.close)
      if (open === null || close === null) return
      if (close <= open) overnightCloseMinutes.push(close)
    })
  })

  if (overnightCloseMinutes.length === 0) return DEFAULT_OPERATIONAL_CLOSE_MINUTES
  return Math.max(...overnightCloseMinutes)
}

export function getRestaurantBusinessPeriod({
  operatingHours,
  timeZone,
  locale = 'es-ES',
  now = new Date(),
}: {
  operatingHours?: any
  timeZone: string
  locale?: string
  now?: Date
}): RestaurantBusinessPeriod {
  const closeMinutes = findOperationalCloseMinutes(operatingHours)
  const currentParts = getZonedParts(now, timeZone)
  const currentMinutes = currentParts.hour * 60 + currentParts.minute
  const localBusinessDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day, 12, 0, 0, 0))

  if (currentMinutes < closeMinutes) {
    localBusinessDate.setUTCDate(localBusinessDate.getUTCDate() - 1)
  }

  const closeHour = Math.floor(closeMinutes / 60)
  const closeMinute = closeMinutes % 60
  const start = zonedLocalToUtc(
    {
      year: localBusinessDate.getUTCFullYear(),
      month: localBusinessDate.getUTCMonth() + 1,
      day: localBusinessDate.getUTCDate(),
      hour: closeHour,
      minute: closeMinute,
    },
    timeZone
  )

  const localEndDate = new Date(localBusinessDate)
  localEndDate.setUTCDate(localEndDate.getUTCDate() + 1)
  const end = zonedLocalToUtc(
    {
      year: localEndDate.getUTCFullYear(),
      month: localEndDate.getUTCMonth() + 1,
      day: localEndDate.getUTCDate(),
      hour: closeHour,
      minute: closeMinute,
    },
    timeZone
  )

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    businessDateLabel: start.toLocaleDateString(locale, {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      timeZone,
    }),
    operationalCloseTime: formatMinutes(closeMinutes),
  }
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
