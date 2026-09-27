import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Clock3,
  CreditCard,
  Package,
  ReceiptText,
  ShoppingBag,
  Table2,
  WalletCards,
} from 'lucide-react'
import { getTenantBySlugOrId } from '@/lib/getTenant'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { buildPurchaseDailyFinance } from '@/lib/purchase-daily-finance'
import {
  formatRestaurantDateTime,
  getRestaurantBusinessPeriod,
  getRestaurantLocalDateKey,
  getRestaurantLocalDateStartUtc,
  getRestaurantLocale,
  getRestaurantTimeZone,
} from '@/lib/restaurant-time'
import { createServiceClient } from '@/lib/supabase/server'

interface DashboardProps {
  params: Promise<{ domain: string }>
}

interface DashboardOrder {
  id: string
  order_number?: string | null
  customer_name?: string | null
  table_number?: number | null
  delivery_type?: string | null
  total?: number | string | null
  status?: string | null
  payment_status?: string | null
  payment_method?: string | null
  payment_breakdown?: unknown
  created_at?: string | null
}

interface BillPayment {
  id: string
  supplier_name?: string | null
  concept?: string | null
  invoice_number?: string | null
  amount?: number | string | null
  payment_method?: string | null
  paid_at?: string | null
}

const PAGE_SIZE = 1000
const cancelledStatuses = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'])

function isActivePaidOrder(order: DashboardOrder) {
  return order.payment_status === 'paid' && !cancelledStatuses.has(String(order.status || '').toLowerCase())
}

function amount(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function paymentLabel(order: DashboardOrder) {
  const breakdown = Array.isArray(order.payment_breakdown)
    ? order.payment_breakdown.filter((row) => amount((row as { amount?: unknown })?.amount) > 0)
    : []

  if (breakdown.length > 1) return 'Mixto'

  const method = String(
    (breakdown[0] as { method?: unknown } | undefined)?.method || order.payment_method || ''
  ).toLowerCase()

  if (method === 'cash') return 'Efectivo'
  if (['card', 'stripe', 'wompi'].includes(method)) return 'Tarjeta'
  return method ? 'Otro' : 'Sin metodo'
}

function orderChannel(order: DashboardOrder) {
  if (order.delivery_type === 'dine-in') return order.table_number ? `Mesa ${order.table_number}` : 'Salon'
  if (order.delivery_type === 'delivery') return 'Entrega'
  return 'Recogida'
}

async function fetchMonthOrders(supabase: any, tenantId: string, startIso: string) {
  const rows: DashboardOrder[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, table_number, delivery_type, total, status, payment_status, payment_method, payment_breakdown, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', startIso)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...((data || []) as DashboardOrder[]))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function fetchMonthBillPayments(supabase: any, tenantId: string, startIso: string) {
  const rows: BillPayment[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cash_bill_payments')
      .select('id, supplier_name, concept, invoice_number, amount, payment_method, paid_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('paid_at', startIso)
      .order('paid_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...((data || []) as BillPayment[]))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { domain: slugOrId } = await params
  const tenant = await getTenantBySlugOrId(slugOrId)

  if (!tenant) {
    return (
      <div className="admin-empty">
        <p className="text-lg font-black text-[#15130f]">Restaurante no encontrado</p>
        <p className="mt-1 text-sm">No pudimos encontrar ese restaurante.</p>
      </div>
    )
  }

  const tenantId = tenant.id
  const tenantSlug = tenant.slug || slugOrId
  const supabase = createServiceClient()
  const now = new Date()

  const [settingsRes, tenantConfigRes] = await Promise.all([
    supabase
      .from('restaurant_settings')
      .select('operating_hours, timezone, country')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase
      .from('tenants')
      .select('country')
      .eq('id', tenantId)
      .maybeSingle(),
  ])

  const country = settingsRes.data?.country || tenantConfigRes.data?.country || 'ES'
  const currencyInfo = getCurrencyByCountry(country)
  const money = (value: number) => formatPriceWithCurrency(value, currencyInfo.code, currencyInfo.locale)
  const timeZone = getRestaurantTimeZone({
    timezone: settingsRes.data?.timezone,
    settingsCountry: settingsRes.data?.country,
    tenantCountry: tenantConfigRes.data?.country,
  })
  const locale = getRestaurantLocale(country)
  const todayKey = getRestaurantLocalDateKey(now, timeZone)
  const [year, month] = todayKey.split('-').map(Number)
  const monthStartKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
  const monthStartIso = getRestaurantLocalDateStartUtc(monthStartKey, timeZone)?.toISOString()
    || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const businessPeriod = getRestaurantBusinessPeriod({
    operatingHours: settingsRes.data?.operating_hours,
    timeZone,
    locale,
    now,
  })

  const [monthOrders, billPayments, openOrdersRes, inventoryRes, reservationsRes, closingRes] = await Promise.all([
    fetchMonthOrders(supabase, tenantId, monthStartIso).catch((error) => {
      console.error('Dashboard month orders error:', error)
      return [] as DashboardOrder[]
    }),
    fetchMonthBillPayments(supabase, tenantId, monthStartIso).catch((error) => {
      console.error('Dashboard bill payments error:', error)
      return [] as BillPayment[]
    }),
    supabase
      .from('orders')
      .select('id, total, table_number, delivery_type, status, payment_status, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', businessPeriod.periodStart)
      .lt('created_at', businessPeriod.periodEnd)
      .or('payment_status.is.null,payment_status.eq.pending')
      .neq('status', 'cancelled')
      .gt('total', 0)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('inventory')
      .select('product_name, current_stock, min_stock')
      .eq('tenant_id', tenantId)
      .order('product_name')
      .limit(1000),
    supabase
      .from('reservations')
      .select('id, customer_name, reservation_time, party_size, status')
      .eq('tenant_id', tenantId)
      .eq('reservation_date', todayKey)
      .in('status', ['pending', 'confirmed'])
      .order('reservation_time'),
    supabase
      .from('cash_closings')
      .select('closed_at')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const paidOrders = monthOrders.filter((order) => {
    if (!isActivePaidOrder(order) || !order.created_at) return false
    const localDate = getRestaurantLocalDateKey(order.created_at, timeZone)
    return localDate >= monthStartKey && localDate <= todayKey
  })
  const activeBillPayments = billPayments.filter((payment) => {
    if (!payment.paid_at) return false
    const localDate = getRestaurantLocalDateKey(payment.paid_at, timeZone)
    return localDate >= monthStartKey && localDate <= todayKey
  })
  const dailyFinance = buildPurchaseDailyFinance({
    orders: paidOrders,
    billPayments: activeBillPayments,
    timeZone,
    monthStartKey,
    todayKey,
  })
  const todayFinance = dailyFinance.find((day) => day.date === todayKey)
  const monthSales = dailyFinance.reduce((sum, day) => sum + day.salesTotal, 0)
  const monthBills = dailyFinance.reduce((sum, day) => sum + day.billPaymentsTotal, 0)
  const monthBalance = monthSales - monthBills
  const todaySales = todayFinance?.salesTotal || 0
  const todayOrdersCount = todayFinance?.orders || 0
  const todayCash = todayFinance?.cashSales || 0
  const todayCard = todayFinance?.cardSales || 0
  const todayOther = todayFinance?.otherSales || 0
  const todayBills = todayFinance?.billPaymentsTotal || 0
  const todayBillsCash = todayFinance?.billPaymentsCash || 0
  const todayBillsExternal = todayFinance?.billPaymentsExternal || 0
  const expectedCash = todayFinance?.netCash || 0
  const averageTicket = todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0

  const todayPaidOrders = paidOrders
    .filter((order) => order.created_at && getRestaurantLocalDateKey(order.created_at, timeZone) === todayKey)
    .slice(0, 6)
  const todayBillPayments = activeBillPayments
    .filter((payment) => payment.paid_at && getRestaurantLocalDateKey(payment.paid_at, timeZone) === todayKey)
    .slice(0, 5)
  const openOrders = (openOrdersRes.data || []) as DashboardOrder[]
  const openTables = new Set(
    openOrders
      .filter((order) => order.delivery_type === 'dine-in' && order.table_number)
      .map((order) => order.table_number)
  )
  const openAccountsTotal = openOrders.reduce((sum, order) => sum + amount(order.total), 0)
  const inventory = inventoryRes.data || []
  const lowStock = inventory.filter((item) => amount(item.current_stock) <= amount(item.min_stock))
  const reservations = reservationsRes.data || []
  const lastClosing = closingRes.data?.closed_at
    ? formatRestaurantDateTime(closingRes.data.closed_at, {
      locale,
      timeZone,
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    : 'Sin cierres registrados'
  const todayDate = getRestaurantLocalDateStartUtc(todayKey, timeZone) || now
  const dateLabelRaw = formatRestaurantDateTime(todayDate, {
    locale,
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const dateLabel = dateLabelRaw ? dateLabelRaw.charAt(0).toUpperCase() + dateLabelRaw.slice(1) : todayKey

  const todayStats = [
    {
      label: 'Ventas de hoy',
      value: money(todaySales),
      helper: `${todayOrdersCount} cobro${todayOrdersCount === 1 ? '' : 's'} - Ticket medio ${money(averageTicket)}`,
      icon: ShoppingBag,
      tone: 'text-[#e43d30]',
    },
    {
      label: 'Cobrado por metodo',
      value: money(todayCash),
      helper: `Efectivo - Tarjeta ${money(todayCard)}${todayOther > 0 ? ` - Otros ${money(todayOther)}` : ''}`,
      icon: CreditCard,
      tone: 'text-sky-700',
    },
    {
      label: 'Facturas pagadas hoy',
      value: money(todayBills),
      helper: `${todayFinance?.billPaymentsCount || 0} pagos - Caja ${money(todayBillsCash)} - Aparte ${money(todayBillsExternal)}`,
      icon: ReceiptText,
      tone: 'text-amber-700',
    },
    {
      label: 'Efectivo esperado',
      value: money(expectedCash),
      helper: 'Efectivo vendido menos facturas pagadas desde caja',
      icon: Banknote,
      tone: expectedCash < 0 ? 'text-red-700' : 'text-emerald-700',
    },
  ]

  return (
    <div className="admin-page">
      <div className="admin-page-header flex-col lg:flex-row">
        <div>
          <p className="admin-eyebrow">Control de hoy</p>
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">{dateLabel}. Ventas, dinero, facturas y pendientes en una sola vista.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
          <Link href={`/${tenantSlug}/admin/compras#pagos-facturas`} className="admin-button-ghost flex-1 sm:flex-none">
            <ReceiptText className="size-4" />
            Registrar factura
          </Link>
          <Link href={`/${tenantSlug}/staff/pos`} className="admin-button-primary flex-1 sm:flex-none">
            <ShoppingBag className="size-4" />
            Abrir TPV
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {todayStats.map(({ label, value, helper, icon: Icon, tone }) => (
          <article key={label} className="admin-card min-w-0 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-black/45">{label}</p>
              <Icon className={`size-5 shrink-0 ${tone}`} />
            </div>
            <p className="mt-4 break-words text-3xl font-black text-[#15130f]">{value}</p>
            <p className="mt-2 text-xs font-bold leading-5 text-black/48">{helper}</p>
          </article>
        ))}
      </div>

      <section className="admin-panel mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[#15130f]">Balance del mes hasta hoy</p>
            <p className="mt-1 text-xs font-semibold text-black/48">Incluye todas las facturas pagadas desde el dia 1.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${tenantSlug}/admin/compras`} className="admin-button-ghost min-h-9 px-3 py-2">Ver facturas</Link>
            <Link href={`/${tenantSlug}/admin/finanzas`} className="admin-button-ghost min-h-9 px-3 py-2">Planificar caja</Link>
          </div>
        </div>
        <div className="grid divide-y divide-black/8 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="px-5 py-4">
            <p className="text-xs font-black uppercase text-black/42">Ventas cobradas</p>
            <p className="mt-2 text-2xl font-black text-[#15130f]">{money(monthSales)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-black uppercase text-black/42">Facturas pagadas</p>
            <p className="mt-2 text-2xl font-black text-red-700">-{money(monthBills)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-black uppercase text-black/42">Queda despues de facturas</p>
            <p className={`mt-2 text-2xl font-black ${monthBalance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{money(monthBalance)}</p>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
            <div>
              <h2 className="font-black text-[#15130f]">Ultimos cobros de hoy</h2>
              <p className="mt-1 text-xs font-semibold text-black/48">Solo ventas pagadas y no anuladas.</p>
            </div>
            <Link href={`/${tenantSlug}/admin/ventas`} className="inline-flex items-center gap-1 text-sm font-black text-[#e43d30]">
              Ver ventas <ArrowRight className="size-4" />
            </Link>
          </div>
          {todayPaidOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ShoppingBag className="mx-auto size-8 text-black/20" />
              <p className="mt-3 text-sm font-black text-[#15130f]">Todavia no hay cobros hoy</p>
            </div>
          ) : (
            <div className="divide-y divide-black/8">
              {todayPaidOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/${tenantSlug}/admin/pedidos/${order.id}`}
                  className="grid gap-2 px-5 py-4 transition hover:bg-white/70 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#15130f]">{order.order_number || `Pedido ${order.id.slice(0, 8)}`}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-black/48">{orderChannel(order)} - {order.customer_name || 'Cliente'}</p>
                  </div>
                  <span className="w-fit rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-xs font-black text-black/58">
                    {paymentLabel(order)}
                  </span>
                  <p className="text-sm font-black text-[#15130f]">{money(amount(order.total))}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="admin-panel overflow-hidden">
            <div className="border-b border-black/10 px-5 py-4">
              <h2 className="font-black text-[#15130f]">Operacion ahora</h2>
              <p className="mt-1 text-xs font-semibold text-black/48">Pendientes que conviene revisar.</p>
            </div>
            <div className="divide-y divide-black/8">
              <Link href={`/${tenantSlug}/staff/pos`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/70">
                <Table2 className="size-5 shrink-0 text-[#e43d30]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#15130f]">{openOrders.length} cuentas abiertas</p>
                  <p className="mt-0.5 text-xs font-semibold text-black/48">{openTables.size} mesas - {money(openAccountsTotal)} pendiente</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-black/35" />
              </Link>
              <Link href={`/${tenantSlug}/admin/reservas`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/70">
                <CalendarDays className="size-5 shrink-0 text-sky-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#15130f]">{reservations.length} reservas para hoy</p>
                  <p className="mt-0.5 text-xs font-semibold text-black/48">Pendientes y confirmadas</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-black/35" />
              </Link>
              <Link href={`/${tenantSlug}/admin/inventario`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/70">
                <Package className={`size-5 shrink-0 ${lowStock.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#15130f]">{lowStock.length} productos con stock bajo</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-black/48">
                    {lowStock.length > 0 ? lowStock.slice(0, 3).map((item) => item.product_name).join(', ') : 'Sin alertas de minimo'}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-black/35" />
              </Link>
              <Link href={`/${tenantSlug}/admin/cierres`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/70">
                <Clock3 className="size-5 shrink-0 text-black/55" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#15130f]">Ultimo cierre de caja</p>
                  <p className="mt-0.5 text-xs font-semibold text-black/48">{lastClosing}</p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-black/35" />
              </Link>
            </div>
          </section>

          <section className="admin-panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <h2 className="font-black text-[#15130f]">Facturas pagadas hoy</h2>
                <p className="mt-1 text-xs font-semibold text-black/48">Caja y pagos por aparte.</p>
              </div>
              <WalletCards className="size-5 text-amber-700" />
            </div>
            {todayBillPayments.length === 0 ? (
              <p className="px-5 py-7 text-sm font-bold text-black/42">No hay facturas pagadas hoy.</p>
            ) : (
              <div className="divide-y divide-black/8">
                {todayBillPayments.map((payment) => {
                  const isExternal = payment.payment_method === 'external'
                  return (
                    <div key={payment.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#15130f]">{payment.supplier_name || payment.concept || 'Factura'}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-black/48">{isExternal ? 'Pago por aparte' : 'Pagada desde caja'}</p>
                      </div>
                      <p className="text-sm font-black text-red-700">-{money(amount(payment.amount))}</p>
                    </div>
                  )
                })}
              </div>
            )}
            <Link href={`/${tenantSlug}/admin/compras#pagos-facturas`} className="flex items-center justify-between border-t border-black/10 px-5 py-3.5 text-sm font-black text-[#e43d30] transition hover:bg-white/70">
              Ver y registrar facturas <ArrowRight className="size-4" />
            </Link>
          </section>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold leading-5 text-black/42">
        El efectivo esperado no incluye fondo inicial, retiros ni diferencias de caja. El importe definitivo se comprueba en Cierres de caja.
      </p>
    </div>
  )
}
