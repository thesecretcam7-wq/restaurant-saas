'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import { AlertCircle, Check, Eye, Printer, WalletCards } from 'lucide-react'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { printCashClosingReceipt } from '@/lib/pos-printer'

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
  expected_total: number
  actual_cash_count: number
  difference: number
  is_balanced: boolean
  transaction_count: number
  orders_completed: number
  orders_cancelled?: number | null
  notes?: string
}

export default function CashClosingsPage() {
  const params = useParams()
  const slug = params.domain as string
  const { tenantId, country } = useTenantResolver(slug)
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null)
  const [printingClosingId, setPrintingClosingId] = useState<string | null>(null)
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
                  <th className="px-5 py-3 text-right">Efectivo</th>
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
                    <td className="px-5 py-4 text-right font-bold text-black/64">{formatPriceWithCurrency(closing.cash_sales, currencyInfo.code, currencyInfo.locale)}</td>
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
                        onClick={() => handlePrintClosing(closing)}
                        disabled={printingClosingId === closing.id}
                        className="inline-flex items-center gap-1.5 text-sm font-black text-[#b87805] disabled:opacity-50"
                      >
                        <Printer className="size-4" />
                        {printingClosingId === closing.id ? 'Imprimiendo' : 'Imprimir'}
                      </button>
                      <button onClick={() => setSelectedClosing(closing)} className="inline-flex items-center gap-1.5 text-sm font-black text-[#e43d30]">
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
                ['Transacciones', selectedClosing.transaction_count.toString()],
                ['Ordenes completadas', selectedClosing.orders_completed.toString()],
                ['Ventas tarjeta', formatPriceWithCurrency(selectedClosing.card_sales, currencyInfo.code, currencyInfo.locale)],
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
                onClick={() => handlePrintClosing(selectedClosing)}
                disabled={printingClosingId === selectedClosing.id}
                className="admin-button-secondary w-full"
              >
                {printingClosingId === selectedClosing.id ? 'Imprimiendo...' : 'Imprimir recibo'}
              </button>
              <button onClick={() => setSelectedClosing(null)} className="admin-button-primary w-full">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
