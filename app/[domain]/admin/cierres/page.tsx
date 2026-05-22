'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import { AlertCircle, CalendarDays, Check, Eye, PencilLine, Printer, RefreshCw, WalletCards } from 'lucide-react'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { printCashClosingReceipt, printMonthlyClosingReceipt } from '@/lib/pos-printer'

interface CashClosing {
  id: string
  staff_id?: string | null
  staff_name: string
  closed_at: string
  cash_sales: number
  card_sales: number
  other_sales?: number | null
  total_sales: number
  total_tax?: number | null
  total_discount?: number | null
  total_delivery_fees?: number | null
  delivery_order_count?: number | null
  expected_total: number
  actual_cash_count: number
  difference: number
  is_balanced: boolean
  transaction_count: number
  orders_completed: number
  orders_cancelled?: number | null
  notes?: string | null
}

interface MonthlyStats {
  periodYear: number
  periodMonth: number
  monthLabel: string
  periodStart: string
  periodEnd: string
  cashSales: number
  cardSales: number
  otherSales: number
  totalSales: number
  totalDeliveryFees: number
  deliveryOrderCount: number
  totalTax: number
  totalDiscount: number
  transactionCount: number
  ordersCompleted: number
  ordersCancelled: number
}

interface MonthlyClosing {
  id: string
  period_year: number
  period_month: number
  period_start: string
  period_end: string
  staff_name: string
  cash_sales: number
  card_sales: number
  other_sales: number
  total_sales: number
  total_delivery_fees?: number | null
  delivery_order_count?: number | null
  total_tax: number
  total_discount: number
  transaction_count: number
  orders_completed: number
  orders_cancelled: number
  notes?: string | null
  closed_at: string
}

function getCurrentMonthInput() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function CashClosingsPage() {
  const params = useParams()
  const slug = params.domain as string
  const { tenantId, country } = useTenantResolver(slug)
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null)
  const [monthInput, setMonthInput] = useState(getCurrentMonthInput)
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>([])
  const [monthlyRestaurant, setMonthlyRestaurant] = useState<{
    displayName: string
    phone: string | null
    defaultReceiptPrinterId: string | null
  } | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlySaving, setMonthlySaving] = useState(false)
  const [printingMonthly, setPrintingMonthly] = useState(false)
  const [monthlyNeedsMigration, setMonthlyNeedsMigration] = useState(false)
  const [printingClosingId, setPrintingClosingId] = useState<string | null>(null)
  const [editingClosing, setEditingClosing] = useState<CashClosing | null>(null)
  const [editActualCash, setEditActualCash] = useState('')
  const [editReason, setEditReason] = useState('')
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!tenantId) return
    async function loadData() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('cash_closings')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('closed_at', { ascending: false })
          .limit(50)

        if (!error && data) {
          const closingRows = data as CashClosing[]
          const missingStaffIds = Array.from(new Set(
            closingRows
              .filter(closing => !closing.staff_name && closing.staff_id)
              .map(closing => closing.staff_id)
              .filter((staffId): staffId is string => Boolean(staffId))
          ))

          let staffById = new Map<string, string>()
          if (missingStaffIds.length > 0) {
            const { data: staffRows } = await supabase
              .from('staff_members')
              .select('id, name')
              .in('id', missingStaffIds)

            staffById = new Map(((staffRows || []) as { id: string; name: string }[]).map(staff => [staff.id, staff.name]))
          }

          setClosings(closingRows.map(closing => ({
            ...closing,
            staff_name: closing.staff_name || (closing.staff_id ? staffById.get(closing.staff_id) : '') || 'Sin asignar',
          })))
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    loadMonthlyData()
  }, [tenantId, monthInput])

  if (loading) return <div className="admin-empty">Cargando cierres de caja...</div>

  const currencyInfo = getCurrencyByCountry(country)
  const totalSales = closings.reduce((sum, closing) => sum + closing.total_sales, 0)
  const balancedCount = closings.filter(closing => closing.is_balanced).length
  const avgDifference = closings.length ? closings.reduce((sum, closing) => sum + Math.abs(closing.difference), 0) / closings.length : 0

  function parsePeriodDate(value: string | undefined, fallback: string) {
    if (!value) return fallback
    const parsed = new Date(value.trim())
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
  }

  async function getClosingDeliverySummary(
    closing: CashClosing,
    supabase: ReturnType<typeof createClient>
  ) {
    const storedTotalDeliveryFees = Number(closing.total_delivery_fees) || 0
    const storedDeliveryOrderCount = Number(closing.delivery_order_count) || 0

    if (storedTotalDeliveryFees > 0 || storedDeliveryOrderCount > 0) {
      return {
        totalDeliveryFees: storedTotalDeliveryFees,
        deliveryOrderCount: storedDeliveryOrderCount,
      }
    }

    const { data: items, error: itemsError } = await supabase
      .from('cash_closing_items')
      .select('order_id')
      .eq('tenant_id', tenantId)
      .eq('cash_closing_id', closing.id)
      .not('order_id', 'is', null)

    if (itemsError) {
      console.warn('No se pudieron consultar los pedidos del cierre:', itemsError.message)
      return {
        totalDeliveryFees: storedTotalDeliveryFees,
        deliveryOrderCount: storedDeliveryOrderCount,
      }
    }

    const orderIds = Array.from(new Set(
      ((items || []) as { order_id: string | null }[])
        .map(item => item.order_id)
        .filter((orderId): orderId is string => Boolean(orderId))
    ))

    if (orderIds.length === 0) {
      return {
        totalDeliveryFees: storedTotalDeliveryFees,
        deliveryOrderCount: storedDeliveryOrderCount,
      }
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, delivery_fee, delivery_type, payment_status, status')
      .eq('tenant_id', tenantId)
      .in('id', orderIds)

    if (ordersError) {
      console.warn('No se pudieron recalcular domicilios del cierre:', ordersError.message)
      return {
        totalDeliveryFees: storedTotalDeliveryFees,
        deliveryOrderCount: storedDeliveryOrderCount,
      }
    }

    return ((orders || []) as any[]).reduce(
      (summary, order) => {
        if (order.status === 'cancelled' || order.payment_status !== 'paid') return summary
        const deliveryFee = Number(order.delivery_fee) || 0
        summary.totalDeliveryFees += deliveryFee
        if (deliveryFee > 0 || order.delivery_type === 'delivery') {
          summary.deliveryOrderCount += 1
        }
        return summary
      },
      { totalDeliveryFees: 0, deliveryOrderCount: 0 }
    )
  }

  async function loadMonthlyData() {
    if (!tenantId) return
    setMonthlyLoading(true)
    try {
      const response = await fetch(`/api/pos/monthly-closing?tenantId=${encodeURIComponent(tenantId)}&month=${encodeURIComponent(monthInput)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'No se pudo calcular el cierre mensual.')
      setMonthlyStats(payload.stats || null)
      setMonthlyClosings(payload.closings || [])
      setMonthlyRestaurant(payload.restaurant || null)
      setMonthlyNeedsMigration(Boolean(payload.needsMigration))
    } catch (error) {
      setMessage({
        type: 'error',
        text: `No se pudo cargar el cierre mensual: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setMonthlyLoading(false)
    }
  }

  function monthlyClosingToStats(closing: MonthlyClosing): MonthlyStats {
    const monthDate = new Date(Date.UTC(closing.period_year, closing.period_month - 1, 1, 12, 0, 0))
    return {
      periodYear: closing.period_year,
      periodMonth: closing.period_month,
      monthLabel: monthDate.toLocaleDateString(currencyInfo.locale, { month: 'long', year: 'numeric' }),
      periodStart: closing.period_start,
      periodEnd: closing.period_end,
      cashSales: Number(closing.cash_sales) || 0,
      cardSales: Number(closing.card_sales) || 0,
      otherSales: Number(closing.other_sales) || 0,
      totalSales: Number(closing.total_sales) || 0,
      totalDeliveryFees: Number(closing.total_delivery_fees) || 0,
      deliveryOrderCount: Number(closing.delivery_order_count) || 0,
      totalTax: Number(closing.total_tax) || 0,
      totalDiscount: Number(closing.total_discount) || 0,
      transactionCount: Number(closing.transaction_count) || 0,
      ordersCompleted: Number(closing.orders_completed) || 0,
      ordersCancelled: Number(closing.orders_cancelled) || 0,
    }
  }

  async function handleSaveMonthlyClosing() {
    if (!tenantId || !monthlyStats) return
    setMonthlySaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/pos/monthly-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          month: monthInput,
          staffName: 'Administrador',
          notes: `Cierre mensual de ${monthlyStats.monthLabel}`,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cerrar el mes.')
      setMessage({ type: 'success', text: 'Cierre mensual guardado. Ya puedes imprimir el ticket.' })
      await loadMonthlyData()
    } catch (error) {
      setMessage({
        type: 'error',
        text: `No se pudo guardar el cierre mensual: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setMonthlySaving(false)
    }
  }

  async function handlePrintMonthlyClosing(stats: MonthlyStats, closing?: MonthlyClosing) {
    if (!tenantId) return
    setPrintingMonthly(true)
    setMessage(null)

    try {
      const printerId = monthlyRestaurant?.defaultReceiptPrinterId
      if (!printerId) {
        throw new Error('No hay impresora de recibos configurada.')
      }

      await printMonthlyClosingReceipt(tenantId, printerId, {
        closingId: closing?.id,
        restaurantName: monthlyRestaurant?.displayName || 'Restaurante',
        restaurantPhone: monthlyRestaurant?.phone || null,
        staffName: closing?.staff_name || 'Administrador',
        closedAt: closing?.closed_at || new Date().toISOString(),
        monthLabel: stats.monthLabel,
        periodStart: stats.periodStart,
        periodEnd: stats.periodEnd,
        cashSales: stats.cashSales,
        cardSales: stats.cardSales,
        otherSales: stats.otherSales,
        totalSales: stats.totalSales,
        totalDeliveryFees: stats.totalDeliveryFees,
        deliveryOrderCount: stats.deliveryOrderCount,
        totalTax: stats.totalTax,
        totalDiscount: stats.totalDiscount,
        transactionCount: stats.transactionCount,
        ordersCompleted: stats.ordersCompleted,
        ordersCancelled: stats.ordersCancelled,
        notes: closing?.notes || null,
        currencyInfo,
      })

      setMessage({ type: 'success', text: 'Ticket de cierre mensual enviado a imprimir.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: `No se pudo imprimir el cierre mensual: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setPrintingMonthly(false)
    }
  }

  async function handlePrintClosing(closing: CashClosing) {
    if (!tenantId) return

    setPrintingClosingId(closing.id)
    setMessage(null)

    try {
      const supabase = createClient()
      const { data: settings, error } = await supabase
        .from('restaurant_settings')
        .select('default_receipt_printer_id, display_name, phone')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!settings?.default_receipt_printer_id) {
        throw new Error('No hay impresora de recibos configurada.')
      }

      const periodMatch = closing.notes?.match(/Periodo operativo:\s*(.+?)\s*-\s*(.+?)(?:\n|$)/)
      const periodStart = parsePeriodDate(periodMatch?.[1], closing.closed_at)
      const periodEnd = parsePeriodDate(periodMatch?.[2], closing.closed_at)
      const deliverySummary = await getClosingDeliverySummary(closing, supabase)

      await printCashClosingReceipt(tenantId, settings.default_receipt_printer_id, {
        closingId: closing.id,
        restaurantName: settings.display_name || 'Restaurante',
        restaurantPhone: settings.phone || null,
        staffName: closing.staff_name || 'Sin asignar',
        closedAt: closing.closed_at,
        periodStart,
        periodEnd,
        cashSales: Number(closing.cash_sales) || 0,
        cardSales: Number(closing.card_sales) || 0,
        otherSales: Number(closing.other_sales) || 0,
        totalSales: Number(closing.total_sales) || 0,
        totalDeliveryFees: deliverySummary.totalDeliveryFees,
        deliveryOrderCount: deliverySummary.deliveryOrderCount,
        totalTax: Number(closing.total_tax) || 0,
        totalDiscount: Number(closing.total_discount) || 0,
        expectedCash: Number(closing.expected_total) || 0,
        actualCash: Number(closing.actual_cash_count) || 0,
        difference: Number(closing.difference) || 0,
        transactionCount: Number(closing.transaction_count) || 0,
        ordersCompleted: Number(closing.orders_completed) || 0,
        ordersCancelled: Number(closing.orders_cancelled) || 0,
        notes: closing.notes || null,
        currencyInfo,
      })

      setMessage({ type: 'success', text: 'Recibo de cierre enviado a imprimir.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: `No se pudo imprimir el recibo: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setPrintingClosingId(null)
    }
  }

  function openCorrectionModal(closing: CashClosing) {
    setEditingClosing(closing)
    setEditActualCash(String(Number(closing.actual_cash_count) || 0))
    setEditReason('')
    setSelectedClosing(null)
    setMessage(null)
  }

  function openClosingDetails(closing: CashClosing) {
    setSelectedClosing(closing)
    if (!tenantId) return

    const supabase = createClient()
    void getClosingDeliverySummary(closing, supabase).then(summary => {
      setSelectedClosing(prev => (
        prev?.id === closing.id
          ? {
              ...prev,
              total_delivery_fees: summary.totalDeliveryFees,
              delivery_order_count: summary.deliveryOrderCount,
            }
          : prev
      ))
    })
  }

  async function handleSaveClosingCorrection() {
    if (!tenantId || !editingClosing) return

    const nextActualCash = Number(editActualCash)
    if (!Number.isFinite(nextActualCash) || nextActualCash < 0) {
      setMessage({ type: 'error', text: 'Ingresa un monto contado valido.' })
      return
    }

    if (!editReason.trim()) {
      setMessage({ type: 'error', text: 'Escribe el motivo de la correccion.' })
      return
    }

    setSavingCorrection(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/pos/cash-closing/${editingClosing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          actualCashCount: nextActualCash,
          reason: editReason.trim(),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'No se pudo corregir el cierre.')

      const updatedClosing = payload.closing as CashClosing
      setClosings(prev => prev.map(closing => (
        closing.id === updatedClosing.id ? { ...closing, ...updatedClosing } : closing
      )))
      setSelectedClosing(prev => (
        prev?.id === updatedClosing.id ? { ...prev, ...updatedClosing } : prev
      ))
      setEditingClosing(null)
      setEditActualCash('')
      setEditReason('')
      setMessage({ type: 'success', text: 'Monto contado corregido y diferencia recalculada.' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: `No se pudo corregir el cierre: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setSavingCorrection(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Caja</p>
          <h1 className="admin-title">Cierres de Caja</h1>
          <p className="admin-subtitle">Historico diario de ventas, conteos, diferencias y responsabilidad por turno.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <WalletCards className="size-5" />
        </span>
      </div>

      {closings.length > 0 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total de cierres', closings.length.toString()],
            ['Balanceados', balancedCount.toString()],
            ['Ventas registradas', formatPriceWithCurrency(totalSales, currencyInfo.code, currencyInfo.locale)],
            ['Diferencia promedio', formatPriceWithCurrency(avgDifference, currencyInfo.code, currencyInfo.locale)],
          ].map(([label, value]) => (
            <article key={label} className="admin-card p-5">
              <p className="text-xs font-black uppercase text-black/42">{label}</p>
              <p className="mt-4 text-2xl font-black text-[#15130f]">{value}</p>
            </article>
          ))}
        </div>
      )}

      <section className="admin-panel mb-5 overflow-hidden">
        <div className="border-b border-black/8 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="admin-eyebrow">Cierre de mes</p>
              <h2 className="text-2xl font-black text-[#15130f]">Cierre mensual</h2>
              <p className="mt-1 text-sm font-semibold text-black/55">Calcula las ventas pagadas del mes, guarda el cierre e imprime el ticket.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black text-[#15130f]">
                <CalendarDays className="size-4 text-[#e43d30]" />
                <input
                  type="month"
                  value={monthInput}
                  onChange={(event) => setMonthInput(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>
              <button
                onClick={loadMonthlyData}
                disabled={monthlyLoading}
                className="admin-button-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${monthlyLoading ? 'animate-spin' : ''}`} />
                Recalcular
              </button>
            </div>
          </div>
        </div>

        {monthlyNeedsMigration && (
          <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">
            Falta aplicar la tabla de cierres mensuales en Supabase. Puedes calcular el mes, pero para guardar el cierre hay que ejecutar la migracion nueva.
          </div>
        )}

        {monthlyStats ? (
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Mes', monthlyStats.monthLabel],
                ['Total ventas', formatPriceWithCurrency(monthlyStats.totalSales, currencyInfo.code, currencyInfo.locale)],
                ['Transacciones', monthlyStats.transactionCount.toString()],
                ['Domicilios', formatPriceWithCurrency(monthlyStats.totalDeliveryFees, currencyInfo.code, currencyInfo.locale)],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl border border-black/10 bg-white/70 p-4">
                  <p className="text-xs font-black uppercase text-black/42">{label}</p>
                  <p className="mt-3 text-xl font-black text-[#15130f]">{value}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-xl border border-black/10 bg-white/70 p-4">
                <h3 className="font-black text-[#15130f]">Detalle del mes</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Efectivo', formatPriceWithCurrency(monthlyStats.cashSales, currencyInfo.code, currencyInfo.locale)],
                    ['Tarjeta', formatPriceWithCurrency(monthlyStats.cardSales, currencyInfo.code, currencyInfo.locale)],
                    ['Otros', formatPriceWithCurrency(monthlyStats.otherSales, currencyInfo.code, currencyInfo.locale)],
                    ['Impuestos', formatPriceWithCurrency(monthlyStats.totalTax, currencyInfo.code, currencyInfo.locale)],
                    ['Pedidos cobrados', monthlyStats.ordersCompleted.toString()],
                    ['Pedidos domicilio', monthlyStats.deliveryOrderCount.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 border-b border-black/8 py-2 text-sm">
                      <span className="font-bold text-black/55">{label}</span>
                      <strong className="text-right text-[#15130f]">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-white/70 p-4">
                <h3 className="font-black text-[#15130f]">Acciones</h3>
                <p className="mt-2 text-sm font-semibold text-black/55">
                  Al cerrar el mes se guarda una foto fija de estas ventas para consultarla e imprimirla despues.
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    onClick={handleSaveMonthlyClosing}
                    disabled={monthlySaving || monthlyNeedsMigration}
                    className="admin-button-primary w-full disabled:opacity-50"
                  >
                    {monthlySaving ? 'Guardando...' : 'Cerrar mes'}
                  </button>
                  <button
                    onClick={() => handlePrintMonthlyClosing(monthlyStats)}
                    disabled={printingMonthly}
                    className="admin-button-secondary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Printer className="size-4" />
                    {printingMonthly ? 'Imprimiendo...' : 'Imprimir ticket'}
                  </button>
                </div>
              </div>
            </div>

            {monthlyClosings.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-black/10 bg-white/70">
                <table className="w-full text-sm">
                  <thead className="bg-white/70">
                    <tr>
                      <th className="px-4 py-3 text-left">Mes cerrado</th>
                      <th className="px-4 py-3 text-left">Responsable</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/8">
                    {monthlyClosings.map(closing => {
                      const stats = monthlyClosingToStats(closing)
                      return (
                        <tr key={closing.id}>
                          <td className="px-4 py-3 font-black text-[#15130f]">{stats.monthLabel}</td>
                          <td className="px-4 py-3 font-bold text-black/58">{closing.staff_name}</td>
                          <td className="px-4 py-3 text-right font-black text-[#15130f]">{formatPriceWithCurrency(Number(closing.total_sales) || 0, currencyInfo.code, currencyInfo.locale)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handlePrintMonthlyClosing(stats, closing)}
                              disabled={printingMonthly}
                              className="inline-flex items-center gap-1.5 text-sm font-black text-[#b87805] disabled:opacity-50"
                            >
                              <Printer className="size-4" />
                              Imprimir
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="admin-empty m-5">Elige un mes para calcular el cierre mensual.</div>
        )}
      </section>

      <section className="admin-panel overflow-hidden">
        {message && (
          <div className={`m-5 rounded-xl border px-4 py-3 text-sm font-black ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        {closings.length === 0 ? (
          <div className="admin-empty m-5">No hay cierres de caja aun</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/50">
                <tr>
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Personal</th>
                  <th className="px-5 py-3 text-right">Contado</th>
                  <th className="px-5 py-3 text-right">Esperado</th>
                  <th className="px-5 py-3 text-right">Diferencia</th>
                  <th className="px-5 py-3 text-center">Estado</th>
                  <th className="px-5 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/8">
                {closings.map(closing => (
                  <tr key={closing.id} className="transition hover:bg-white/70">
                    <td className="px-5 py-4 font-bold text-black/58">{new Date(closing.closed_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-5 py-4 font-black text-[#15130f]">{closing.staff_name}</td>
                    <td className="px-5 py-4 text-right font-bold text-black/64">{formatPriceWithCurrency(closing.actual_cash_count, currencyInfo.code, currencyInfo.locale)}</td>
                    <td className="px-5 py-4 text-right font-bold text-black/64">{formatPriceWithCurrency(closing.expected_total, currencyInfo.code, currencyInfo.locale)}</td>
                    <td className={`px-5 py-4 text-right font-black ${Math.abs(closing.difference) < 0.01 ? 'text-[#1c8b5f]' : 'text-red-600'}`}>{formatPriceWithCurrency(Math.abs(closing.difference), currencyInfo.code, currencyInfo.locale)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${closing.is_balanced ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {closing.is_balanced ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
                        {closing.is_balanced ? 'Balanceado' : 'Diferencia'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-3">
                      <button
                        onClick={() => openCorrectionModal(closing)}
                        className="inline-flex items-center gap-1.5 text-sm font-black text-[#1c8b5f]"
                      >
                        <PencilLine className="size-4" />
                        Corregir
                      </button>
                      <button
                        onClick={() => handlePrintClosing(closing)}
                        disabled={printingClosingId === closing.id}
                        className="inline-flex items-center gap-1.5 text-sm font-black text-[#b87805] disabled:opacity-50"
                      >
                        <Printer className="size-4" />
                        {printingClosingId === closing.id ? 'Imprimiendo' : 'Imprimir'}
                      </button>
                      <button onClick={() => openClosingDetails(closing)} className="inline-flex items-center gap-1.5 text-sm font-black text-[#e43d30]">
                        <Eye className="size-4" />
                        Ver
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="admin-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <h2 className="text-2xl font-black text-[#15130f]">Detalle del cierre</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ['Personal', selectedClosing.staff_name],
                ['Ventas cobradas', selectedClosing.transaction_count.toString()],
                ['Ventas tarjeta', formatPriceWithCurrency(selectedClosing.card_sales, currencyInfo.code, currencyInfo.locale)],
                ['Valor domicilios', formatPriceWithCurrency(Number(selectedClosing.total_delivery_fees) || 0, currencyInfo.code, currencyInfo.locale)],
                ['Numero domicilios', String(Number(selectedClosing.delivery_order_count) || 0)],
                ['Monto esperado', formatPriceWithCurrency(selectedClosing.expected_total, currencyInfo.code, currencyInfo.locale)],
                ['Monto real', formatPriceWithCurrency(selectedClosing.actual_cash_count, currencyInfo.code, currencyInfo.locale)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-black/10 bg-white/60 p-4">
                  <p className="text-xs font-black uppercase text-black/42">{label}</p>
                  <p className="mt-2 font-black text-[#15130f]">{value}</p>
                </div>
              ))}
            </div>
            {selectedClosing.notes && <p className="mt-5 rounded-xl bg-black/5 p-4 text-sm font-semibold text-black/60">{selectedClosing.notes}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => openCorrectionModal(selectedClosing)}
                className="admin-button-secondary w-full"
              >
                Corregir monto contado
              </button>
              <button
                onClick={() => handlePrintClosing(selectedClosing)}
                disabled={printingClosingId === selectedClosing.id}
                className="admin-button-secondary w-full"
              >
                {printingClosingId === selectedClosing.id ? 'Imprimiendo...' : 'Imprimir recibo'}
              </button>
              <button onClick={() => setSelectedClosing(null)} className="admin-button-primary w-full sm:col-span-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editingClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="admin-panel max-h-[90vh] w-full max-w-xl overflow-y-auto p-6">
            <h2 className="text-2xl font-black text-[#15130f]">Corregir cierre</h2>
            <p className="mt-2 text-sm font-semibold text-black/55">
              Cambia solo el monto real contado. Las ventas esperadas se mantienen y la diferencia se recalcula.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-white/60 p-4">
                <p className="text-xs font-black uppercase text-black/42">Esperado</p>
                <p className="mt-2 text-xl font-black text-[#15130f]">
                  {formatPriceWithCurrency(Number(editingClosing.expected_total) || 0, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/60 p-4">
                <p className="text-xs font-black uppercase text-black/42">Contado anterior</p>
                <p className="mt-2 text-xl font-black text-[#15130f]">
                  {formatPriceWithCurrency(Number(editingClosing.actual_cash_count) || 0, currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
            </div>

            <label className="mt-5 block text-xs font-black uppercase text-black/42">
              Nuevo monto contado
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={editActualCash}
              onChange={(event) => setEditActualCash(event.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-lg font-black text-[#15130f] outline-none focus:border-[#e43d30]"
            />

            {editActualCash && Number.isFinite(Number(editActualCash)) && (
              <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-4">
                <p className="text-xs font-black uppercase text-black/42">Nueva diferencia</p>
                <p className={`mt-2 text-xl font-black ${Math.abs((Number(editingClosing.expected_total) || 0) - Number(editActualCash)) < 0.01 ? 'text-[#1c8b5f]' : 'text-red-600'}`}>
                  {formatPriceWithCurrency(Math.abs((Number(editingClosing.expected_total) || 0) - Number(editActualCash)), currencyInfo.code, currencyInfo.locale)}
                </p>
              </div>
            )}

            <label className="mt-5 block text-xs font-black uppercase text-black/42">
              Motivo de la correccion
            </label>
            <textarea
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              placeholder="Ej: se ingreso efectivo de mas por error"
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[#15130f] outline-none focus:border-[#e43d30]"
            />

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setEditingClosing(null)}
                disabled={savingCorrection}
                className="admin-button-secondary w-full disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClosingCorrection}
                disabled={savingCorrection}
                className="admin-button-primary w-full disabled:opacity-50"
              >
                {savingCorrection ? 'Guardando...' : 'Guardar correccion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
