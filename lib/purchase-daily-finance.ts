import { getRestaurantLocalDateKey } from './restaurant-time'

interface DailyFinanceOrder {
  id?: string
  total?: number | string | null
  created_at?: string | null
  payment_method?: string | null
  payment_breakdown?: unknown
}

interface DailyFinanceBillPayment {
  cash_closing_id?: string | null
  amount?: number | string | null
  paid_at?: string | null
  payment_method?: string | null
}

export interface PurchaseDailyFinanceDay {
  date: string
  orders: number
  salesTotal: number
  cashSales: number
  cardSales: number
  otherSales: number
  billPaymentsTotal: number
  billPaymentsCash: number
  billPaymentsExternal: number
  billPaymentsCount: number
  netTotal: number
  netCash: number
  availableCash: number
  runningAvailableCash: number
  runningNetTotal: number
  settledAvailableCash: number
  pendingCash: number
  runningSettledAvailableCash: number
}

function toAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function paymentRowsForOrder(order: DailyFinanceOrder) {
  const breakdown = Array.isArray(order.payment_breakdown) ? order.payment_breakdown : []
  const rows = breakdown
    .map((payment) => {
      const row = payment && typeof payment === 'object' ? payment as Record<string, unknown> : {}
      return {
        method: String(row.method || '').trim().toLowerCase(),
        amount: toAmount(row.amount),
      }
    })
    .filter((payment) => payment.method && payment.amount > 0)

  if (rows.length > 0) return rows

  const total = toAmount(order.total)
  const method = String(order.payment_method || '').trim().toLowerCase()
  return method && total > 0 ? [{ method, amount: total }] : []
}

function monthDateKeys(monthStartKey: string, todayKey: string) {
  const [startYear, startMonth] = monthStartKey.split('-').map(Number)
  const [todayYear, todayMonth, todayDay] = todayKey.split('-').map(Number)
  if (!startYear || !startMonth || startYear !== todayYear || startMonth !== todayMonth || !todayDay) return []

  return Array.from({ length: todayDay }, (_, index) => (
    `${String(startYear).padStart(4, '0')}-${String(startMonth).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  ))
}

export function buildPurchaseDailyFinance({
  orders,
  billPayments,
  timeZone,
  monthStartKey,
  todayKey,
  closedOrderIds = new Set<string>(),
}: {
  orders: DailyFinanceOrder[]
  billPayments: DailyFinanceBillPayment[]
  timeZone: string
  monthStartKey: string
  todayKey: string
  closedOrderIds?: ReadonlySet<string>
}) {
  const days = new Map<string, PurchaseDailyFinanceDay>()
  monthDateKeys(monthStartKey, todayKey).forEach((date) => {
    days.set(date, {
      date,
      orders: 0,
      salesTotal: 0,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      billPaymentsTotal: 0,
      billPaymentsCash: 0,
      billPaymentsExternal: 0,
      billPaymentsCount: 0,
      netTotal: 0,
      netCash: 0,
      availableCash: 0,
      runningAvailableCash: 0,
      runningNetTotal: 0,
      settledAvailableCash: 0,
      pendingCash: 0,
      runningSettledAvailableCash: 0,
    })
  })

  orders.forEach((order) => {
    if (!order.created_at) return
    const day = days.get(getRestaurantLocalDateKey(order.created_at, timeZone))
    if (!day) return

    day.orders += 1
    day.salesTotal += toAmount(order.total)
    paymentRowsForOrder(order).forEach((payment) => {
      if (payment.method === 'cash') {
        day.cashSales += payment.amount
        if (order.id && closedOrderIds.has(order.id)) {
          day.settledAvailableCash += payment.amount
        } else {
          day.pendingCash += payment.amount
        }
      } else if (['card', 'stripe', 'wompi'].includes(payment.method)) {
        day.cardSales += payment.amount
      } else {
        day.otherSales += payment.amount
      }
    })
  })

  billPayments.forEach((payment) => {
    if (!payment.paid_at) return
    const day = days.get(getRestaurantLocalDateKey(payment.paid_at, timeZone))
    if (!day) return

    const amount = toAmount(payment.amount)
    const method = String(payment.payment_method || 'cash').trim().toLowerCase()
    day.billPaymentsCount += 1
    day.billPaymentsTotal += amount
    if (method === 'external') {
      day.billPaymentsExternal += amount
      day.settledAvailableCash -= amount
    } else {
      day.billPaymentsCash += amount
      if (payment.cash_closing_id) {
        day.settledAvailableCash -= amount
      } else {
        day.pendingCash -= amount
      }
    }
  })

  let runningNetTotal = 0
  let runningAvailableCash = 0
  let runningSettledAvailableCash = 0
  return Array.from(days.values()).map((day) => {
    day.netTotal = day.salesTotal - day.billPaymentsTotal
    day.netCash = day.cashSales - day.billPaymentsCash
    day.availableCash = day.cashSales - day.billPaymentsTotal
    runningAvailableCash += day.availableCash
    day.runningAvailableCash = runningAvailableCash
    runningSettledAvailableCash += day.settledAvailableCash
    day.runningSettledAvailableCash = runningSettledAvailableCash
    runningNetTotal += day.netTotal
    day.runningNetTotal = runningNetTotal
    return day
  })
}
