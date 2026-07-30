import Link from 'next/link'
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CircleDollarSign,
  Landmark,
  Package,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import {
  getRestaurantLocalDateKey,
  getRestaurantLocalDateStartUtc,
  getRestaurantTimeZone,
} from '@/lib/restaurant-time'

type FinancialAssistantProps = {
  tenantId: string
  tenantSlug: string
  compact?: boolean
}

type OrderRow = {
  id: string
  total: number | string | null
  status: string | null
  payment_status: string | null
  payment_method: string | null
  created_at: string | null
}

type PurchaseInvoiceRow = {
  id: string
  supplier_name: string | null
  invoice_date: string | null
  total: number | string | null
}

type InventoryRow = {
  product_name: string | null
  current_stock: number | string | null
  min_stock: number | string | null
  max_stock: number | string | null
  cost_per_unit: number | string | null
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function isActivePaidOrder(order: OrderRow) {
  const status = String(order.status || '').toLowerCase()
  return order.payment_status === 'paid' && !['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'].includes(status)
}

function getEstimatedTaxRate(country: string) {
  const normalized = String(country || 'ES').trim().toUpperCase()
  if (normalized === 'CO' || normalized === 'COLOMBIA') return 0.08
  if (normalized === 'US' || normalized === 'USA') return 0.07
  if (normalized === 'MX' || normalized === 'MEXICO') return 0.16
  return 0.21
}

function roundMoney(value: number) {
  return Math.max(0, Math.round(value * 100) / 100)
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) return '0.0%'
  return `${value.toFixed(1)}%`
}

async function fetchAllOrders(supabase: any, tenantId: string, monthStartIso: string) {
  const pageSize = 1000
  let from = 0
  let totalCount = 0
  const rows: OrderRow[] = []

  while (true) {
    const { data, error, count } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, payment_method, created_at', { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStartIso)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (from === 0) totalCount = count || 0
    rows.push(...((data || []) as OrderRow[]))

    if (!data || data.length < pageSize || from + pageSize >= totalCount) break
    from += pageSize
  }

  return rows
}

async function fetchAllPurchaseInvoices(supabase: any, tenantId: string, monthStartKey: string) {
  const pageSize = 1000
  let from = 0
  let totalCount = 0
  const rows: PurchaseInvoiceRow[] = []

  while (true) {
    const { data, error, count } = await supabase
      .from('supplier_purchase_invoices')
      .select('id, supplier_name, invoice_date, total', { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .gte('invoice_date', monthStartKey)
      .order('invoice_date', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (from === 0) totalCount = count || 0
    rows.push(...((data || []) as PurchaseInvoiceRow[]))

    if (!data || data.length < pageSize || from + pageSize >= totalCount) break
    from += pageSize
  }

  return rows
}

async function fetchAllInventory(supabase: any, tenantId: string) {
  const pageSize = 1000
  let from = 0
  let totalCount = 0
  const rows: InventoryRow[] = []

  while (true) {
    const { data, error, count } = await supabase
      .from('inventory')
      .select('product_name, current_stock, min_stock, max_stock, cost_per_unit', { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (from === 0) totalCount = count || 0
    rows.push(...((data || []) as InventoryRow[]))

    if (!data || data.length < pageSize || from + pageSize >= totalCount) break
    from += pageSize
  }

  return rows
}

export async function FinancialAssistant({ tenantId, tenantSlug, compact = false }: FinancialAssistantProps) {
  const supabase = createServiceClient()
  const now = new Date()

  const [tenantRes, settingsRes] = await Promise.all([
    supabase.from('tenants').select('country, organization_name').eq('id', tenantId).maybeSingle(),
    supabase.from('restaurant_settings').select('country, timezone').eq('tenant_id', tenantId).maybeSingle(),
  ])

  const country = settingsRes.data?.country || tenantRes.data?.country || 'ES'
  const timeZone = getRestaurantTimeZone({
    timezone: settingsRes.data?.timezone,
    settingsCountry: settingsRes.data?.country,
    tenantCountry: tenantRes.data?.country,
  })
  const currencyInfo = getCurrencyByCountry(country)
  const money = (value: number) => formatPriceWithCurrency(value, currencyInfo.code, currencyInfo.locale)
  const todayKey = getRestaurantLocalDateKey(now, timeZone)
  const [year, month] = todayKey.split('-').map(Number)
  const monthStartKey = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
  const todayStartIso = getRestaurantLocalDateStartUtc(todayKey, timeZone)?.toISOString() || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStartIso = getRestaurantLocalDateStartUtc(monthStartKey, timeZone)?.toISOString() || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [allOrders, purchases, inventory] = await Promise.all([
    fetchAllOrders(supabase, tenantId, monthStartIso),
    fetchAllPurchaseInvoices(supabase, tenantId, monthStartKey),
    fetchAllInventory(supabase, tenantId),
  ])

  const orders = allOrders.filter(isActivePaidOrder)

  const monthRevenue = orders.reduce((sum, order) => sum + toNumber(order.total), 0)
  const todayRevenue = orders
    .filter((order) => order.created_at && new Date(order.created_at) >= new Date(todayStartIso))
    .reduce((sum, order) => sum + toNumber(order.total), 0)
  const purchaseSpend = purchases.reduce((sum, invoice) => sum + toNumber(invoice.total), 0)
  const cardRevenue = orders
    .filter((order) => ['stripe', 'card', 'tarjeta', 'wompi'].includes(String(order.payment_method || '').toLowerCase()))
    .reduce((sum, order) => sum + toNumber(order.total), 0)

  const lowStockItems = inventory
    .map((item) => {
      const currentStock = toNumber(item.current_stock)
      const minStock = toNumber(item.min_stock)
      const maxStock = toNumber(item.max_stock)
      const costPerUnit = toNumber(item.cost_per_unit)
      const targetStock = maxStock > minStock ? maxStock : minStock
      const missingUnits = Math.max(targetStock - currentStock, 0)
      return {
        name: item.product_name || 'Producto',
        missingUnits,
        estimatedCost: missingUnits * costPerUnit,
        isLow: minStock > 0 && currentStock <= minStock,
      }
    })
    .filter((item) => item.isLow)
    .sort((a, b) => b.estimatedCost - a.estimatedCost)

  const restockNeed = lowStockItems.reduce((sum, item) => sum + item.estimatedCost, 0)
  const daysElapsed = Math.max(1, now.getDate())
  const averageDailySales = monthRevenue / daysElapsed
  const foodCostTarget = monthRevenue * 0.35
  const supplierReserve = monthRevenue > 0 ? Math.max(purchaseSpend, foodCostTarget) : 0
  const taxRate = getEstimatedTaxRate(country)
  const taxReserve = monthRevenue > 0 ? monthRevenue * (taxRate / (1 + taxRate)) : 0
  const paymentFeesReserve = cardRevenue > 0 ? cardRevenue * 0.029 : monthRevenue * 0.012
  const operationReserve = monthRevenue * 0.12
  const safetyReserve = Math.max(monthRevenue * 0.05, averageDailySales * 2)

  const buckets = [
    {
      label: 'Proveedores y materia prima',
      amount: roundMoney(supplierReserve),
      helper: purchaseSpend > 0
        ? `Facturas del mes: ${money(purchaseSpend)}. Objetivo maximo sugerido: 35% de ventas.`
        : 'Sin facturas registradas este mes; se usa una referencia del 35% de ventas.',
      icon: ShoppingCart,
      tone: 'text-[#e43d30]',
    },
    {
      label: 'Reposicion urgente',
      amount: roundMoney(restockNeed),
      helper: lowStockItems.length > 0
        ? `${lowStockItems.length} producto${lowStockItems.length === 1 ? '' : 's'} bajo minimo.`
        : 'Inventario sin productos bajo minimo con costo registrado.',
      icon: Package,
      tone: 'text-amber-700',
    },
    {
      label: 'Impuestos estimados',
      amount: roundMoney(taxReserve),
      helper: `Reserva orientativa con tasa ${Math.round(taxRate * 100)}%. Ajustar con contabilidad.`,
      icon: Landmark,
      tone: 'text-sky-700',
    },
    {
      label: 'Comisiones de pago',
      amount: roundMoney(paymentFeesReserve),
      helper: cardRevenue > 0
        ? `Calculado sobre ${money(cardRevenue)} en pagos digitales.`
        : 'Estimacion baja porque no hay pagos digitales detectados.',
      icon: ReceiptText,
      tone: 'text-violet-700',
    },
    {
      label: 'Operacion y nomina',
      amount: roundMoney(operationReserve),
      helper: 'Bolsa para turnos, servicios, imprevistos operativos y pagos recurrentes.',
      icon: Banknote,
      tone: 'text-emerald-700',
    },
    {
      label: 'Colchon de caja',
      amount: roundMoney(safetyReserve),
      helper: 'Minimo sugerido: dos dias de venta promedio o 5% del mes.',
      icon: ShieldCheck,
      tone: 'text-[#15130f]',
    },
  ]

  const totalToSeparate = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)
  const availableAfterReserve = monthRevenue - totalToSeparate
  const purchaseRatio = monthRevenue > 0 ? (purchaseSpend / monthRevenue) * 100 : 0
  const reserveRatio = monthRevenue > 0 ? (totalToSeparate / monthRevenue) * 100 : 0
  const bucketsWithRatios = buckets.map((bucket) => ({
    ...bucket,
    salesRatio: monthRevenue > 0 ? (bucket.amount / monthRevenue) * 100 : 0,
    reserveShare: totalToSeparate > 0 ? (bucket.amount / totalToSeparate) * 100 : 0,
  }))
  const priority = monthRevenue <= 0
    ? 'Registra ventas cobradas para activar el asistente.'
    : availableAfterReserve < 0
      ? 'Hay tension de caja: prioriza proveedores, impuestos y compras urgentes antes de retirar utilidad.'
      : purchaseRatio > 42
        ? 'Las compras estan pesadas frente a ventas. Revisa precios de proveedores y merma.'
        : 'Caja sana: separa las bolsas y deja el excedente como utilidad disponible.'

  const visibleBuckets = bucketsWithRatios

  if (compact) {
    const compactBuckets = bucketsWithRatios.slice(0, 4)

    return (
      <section className="financial-assistant admin-panel overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="admin-eyebrow">Separacion sugerida</p>
            <h2 className="mt-1 text-2xl font-black text-[#15130f]">
              Resumen de dinero a separar
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/55">
              Vista corta del dashboard. El detalle completo queda en Finanzas.
            </p>
          </div>
          <div className="financial-total-card rounded-2xl border border-black/10 bg-[#15130f] p-4 text-white lg:min-w-[18rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="financial-total-label text-xs font-black uppercase text-white/45">Total a separar</span>
              <PiggyBank className="size-5 text-[#f4b860]" />
            </div>
            <p className="financial-total-amount mt-3 text-3xl font-black">{money(totalToSeparate)}</p>
            <p className="financial-total-meta mt-1 text-xs font-black uppercase text-white/60">
              {formatPercentage(reserveRatio)} de las ventas del mes
            </p>
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {compactBuckets.map(({ label, amount, icon: Icon, tone, salesRatio }) => (
            <article key={label} className="rounded-2xl border border-black/8 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <Icon className={`size-5 ${tone}`} />
                <span className="financial-ratio-pill">{formatPercentage(salesRatio)}</span>
              </div>
              <p className="mt-3 text-sm font-black text-[#15130f]">{label}</p>
              <p className="mt-1 text-xl font-black text-[#15130f]">{money(amount)}</p>
            </article>
          ))}
        </div>

        <div className="border-t border-black/10 px-5 py-4">
          <Link href={`/${tenantSlug}/admin/finanzas`} className="text-sm font-black text-[#e43d30]">
            Ver desglose completo en Finanzas
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="financial-assistant admin-panel overflow-hidden">
      <div className="border-b border-black/10 bg-white/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="admin-eyebrow">Asistente financiero</p>
            <h2 className="mt-1 text-2xl font-black text-[#15130f]">
              Dinero que debes separar
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/55">
              Calculado con ventas cobradas del mes, facturas de compras, pagos digitales e inventario bajo minimo.
            </p>
          </div>
          <div className="financial-total-card grid min-w-[min(100%,22rem)] gap-2 rounded-2xl border border-black/10 bg-[#15130f] p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="financial-total-label text-xs font-black uppercase text-white/45">Separar ahora</span>
              <PiggyBank className="size-5 text-[#f4b860]" />
            </div>
            <p className="financial-total-amount text-3xl font-black">{money(totalToSeparate)}</p>
            <p className="financial-total-meta text-xs font-black uppercase text-white/60">
              {formatPercentage(reserveRatio)} de las ventas del mes
            </p>
            <p className={`text-sm font-black ${availableAfterReserve >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
              {availableAfterReserve >= 0 ? 'Excedente estimado' : 'Falta estimada'}: {money(Math.abs(availableAfterReserve))}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ventas del mes', value: money(monthRevenue), icon: Wallet, helper: `${orders.length} pedido${orders.length === 1 ? '' : 's'} cobrado${orders.length === 1 ? '' : 's'}` },
          { label: 'Ventas de hoy', value: money(todayRevenue), icon: TrendingUp, helper: `Promedio diario: ${money(averageDailySales)}` },
          { label: 'Compras registradas', value: money(purchaseSpend), icon: ShoppingCart, helper: `${purchaseRatio.toFixed(1)}% de las ventas` },
          { label: 'Reserva sobre ventas', value: `${reserveRatio.toFixed(1)}%`, icon: Calculator, helper: 'Peso de todas las bolsas sugeridas' },
        ].map(({ label, value, icon: Icon, helper }) => (
          <article key={label} className="rounded-2xl border border-black/8 bg-black/[0.025] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-black/42">{label}</p>
              <Icon className="size-5 text-[#e43d30]" />
            </div>
            <p className="mt-4 text-2xl font-black text-[#15130f]">{value}</p>
            <p className="mt-1 text-xs font-bold text-black/45">{helper}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="space-y-3">
          {visibleBuckets.map(({ label, amount, helper, icon: Icon, tone, salesRatio, reserveShare }) => (
            <article key={label} className="grid gap-3 rounded-2xl border border-black/8 bg-white/70 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="grid size-11 place-items-center rounded-xl bg-black/[0.04]">
                <Icon className={`size-5 ${tone}`} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black text-[#15130f]">{label}</p>
                  <span className="financial-ratio-pill">{formatPercentage(salesRatio)} ventas</span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-black/50">{helper}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#f8c55f]"
                    style={{ width: `${Math.min(Math.max(salesRatio, 0), 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl font-black text-[#15130f]">{money(amount)}</p>
                <p className="mt-1 text-xs font-black text-black/45">
                  {formatPercentage(reserveShare)} del separado
                </p>
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-black/10 bg-[#fff7ed] p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="size-5 text-[#e43d30]" />
            <h3 className="font-black text-[#15130f]">Decision recomendada</h3>
          </div>
          <p className="mt-3 text-sm font-bold leading-6 text-black/62">{priority}</p>

          {lowStockItems.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-700" />
                <p className="text-sm font-black text-amber-900">Comprar primero</p>
              </div>
              <div className="mt-3 space-y-2">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-xs font-bold text-amber-900/75">
                    <span className="truncate">{item.name}</span>
                    <span>{money(item.estimatedCost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/${tenantSlug}/admin/compras`} className="admin-button-ghost bg-white sm:w-auto">
              Ver compras
            </Link>
            <Link href={`/${tenantSlug}/admin/ventas`} className="admin-button-ghost bg-white sm:w-auto">
              Ver ventas
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-black/42">
            Es una guia de caja operativa, no una declaracion fiscal. Ajusta porcentajes con tu contable cuando tengas reglas propias.
          </p>
        </aside>
      </div>

      {compact && (
        <div className="border-t border-black/10 px-5 py-4">
          <Link href={`/${tenantSlug}/admin/finanzas`} className="text-sm font-black text-[#e43d30]">
            Abrir asistente financiero completo
          </Link>
        </div>
      )}
    </section>
  )
}
