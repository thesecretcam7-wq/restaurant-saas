import { getRestaurantLocalDateKey, getRestaurantLocalDateStartUtc } from './restaurant-time'

type Sale = {
  created_at: string
  total: number | string | null
  payment_status?: string | null
  status?: string | null
}

const cancelledStatuses = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'])

export function isPaidSale(sale: Sale) {
  return sale.payment_status === 'paid' && !cancelledStatuses.has((sale.status || '').toLowerCase())
}

export function getMonthComparisonWindow(now: Date, timeZone: string) {
  const today = getRestaurantLocalDateKey(now, timeZone)
  const [year, month, day] = today.split('-').map(Number)
  const previousDate = new Date(Date.UTC(year, month - 1, 0, 12))
  const previousLastDay = previousDate.getUTCDate()
  const previousMonth = getRestaurantLocalDateKey(previousDate, 'UTC').slice(0, 7)
  const currentMonth = today.slice(0, 7)
  return {
    today,
    day,
    currentMonth,
    previousMonth,
    previousLastDay,
    previousThrough: `${previousMonth}-${String(Math.min(day, previousLastDay)).padStart(2, '0')}`,
    previousStart: getRestaurantLocalDateStartUtc(`${previousMonth}-01`, timeZone)!.toISOString(),
  }
}

export function buildMonthSalesComparison(sales: Sale[], now: Date, timeZone: string) {
  const window = getMonthComparisonWindow(now, timeZone)
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  })
  const cutoffTime = clock.format(now)
  const current = Array<number>(window.day).fill(0)
  const previous = Array<number>(window.day).fill(0)
  let currentOrders = 0
  let previousOrders = 0

  for (const sale of sales) {
    if (!isPaidSale(sale)) continue
    const timestamp = Date.parse(sale.created_at)
    const amount = Number(sale.total)
    if (!Number.isFinite(timestamp) || !Number.isFinite(amount) || timestamp > now.getTime()) continue
    const date = getRestaurantLocalDateKey(timestamp, timeZone)
    const month = date.slice(0, 7)
    const index = Number(date.slice(8, 10)) - 1
    const cents = Math.round(amount * 100)
    if (month === window.currentMonth && index < window.day) {
      current[index] += cents
      currentOrders++
    } else if (month === window.previousMonth && date <= window.previousThrough) {
      // Compare the current partial day with the same local clock time last month.
      if (date === window.previousThrough && window.day <= window.previousLastDay
        && clock.format(new Date(timestamp)) > cutoffTime) continue
      previous[index] += cents
      previousOrders++
    }
  }

  let currentCents = 0
  let previousCents = 0
  const points = current.map((amount, index) => {
    currentCents += amount
    previousCents += previous[index]
    return { day: index + 1, current: currentCents / 100, previous: previousCents / 100 }
  })
  const difference = (currentCents - previousCents) / 100
  return {
    ...window,
    updatedAt: now.toISOString(),
    cutoffTime,
    currentTotal: currentCents / 100,
    previousTotal: previousCents / 100,
    difference,
    percentChange: previousCents === 0 ? null : Math.round((currentCents - previousCents) / previousCents * 1000) / 10,
    currentOrders,
    previousOrders,
    points,
  }
}

export type MonthSalesComparison = ReturnType<typeof buildMonthSalesComparison>
