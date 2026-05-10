'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import { AlertCircle, Check, Eye, WalletCards } from 'lucide-react'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'

interface CashClosing {
  id: string
  staff_id?: string | null
  staff_name: string
  closed_at: string
  cash_sales: number
  card_sales: number
  total_sales: number
  expected_total: number
  actual_cash_count: number
  difference: number
  is_balanced: boolean
  transaction_count: number
  orders_completed: number
  notes?: string
}

export default function CashClosingsPage() {
  const params = useParams()
  const slug = params.domain as string
  const { tenantId, country } = useTenantResolver(slug)
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null)

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
          const missingStaffIds = Array.from(new Set(
            data
              .filter(closing => !closing.staff_name && closing.staff_id)
              .map(closing => closing.staff_id)
              .filter(Boolean)
          ))

          let staffById = new Map<string, string>()
          if (missingStaffIds.length > 0) {
            const { data: staffRows } = await supabase
              .from('staff_members')
              .select('id, name')
              .in('id', missingStaffIds)

            staffById = new Map((staffRows || []).map(staff => [staff.id, staff.name]))
          }

          setClosings(data.map(closing => ({
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
                      <button onClick={() => setSelectedClosing(closing)} className="inline-flex items-center gap-1.5 text-sm font-black text-[#e43d30]">
                        <Eye className="size-4" />
                        Ver
                      </button>
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
            <button onClick={() => setSelectedClosing(null)} className="admin-button-primary mt-6 w-full">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
