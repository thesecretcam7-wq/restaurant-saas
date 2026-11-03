'use client'

import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { getRestaurantLocalDateKey } from '@/lib/restaurant-time'
import { formatPriceWithCurrency } from '@/lib/currency'

type Payment = {
  id?: string
  supplier_name?: string | null
  concept?: string | null
  invoice_number?: string | null
  notes?: string | null
  staff_name?: string | null
  amount: number
  paid_at?: string | null
  payment_method?: string | null
}

export function PaidInvoicesByDay({ payments, monthLabel, timeZone, currency, locale }: {
  payments: Payment[]
  monthLabel: string
  timeZone: string
  currency: string
  locale: string
}) {
  const [day, setDay] = useState('')
  const [search, setSearch] = useState('')
  const money = (amount: number) => formatPriceWithCurrency(amount, currency, locale)
  const formatDay = (date: string) => date === 'sin-fecha'
    ? 'Sin fecha de pago'
    : new Date(`${date}T12:00:00`).toLocaleDateString(locale)
  const groups = useMemo(() => {
    const byDay = new Map<string, Payment[]>()
    for (const payment of payments) {
      const validDate = payment.paid_at && Number.isFinite(new Date(payment.paid_at).getTime())
      const key = validDate ? getRestaurantLocalDateKey(payment.paid_at!, timeZone) : 'sin-fecha'
      byDay.set(key, [...(byDay.get(key) || []), payment])
    }
    return Array.from(byDay, ([date, items]) => ({ date, items })).sort((a, b) => b.date.localeCompare(a.date))
  }, [payments, timeZone])
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(locale)
  const query = normalize(search.trim())
  const visible = groups.filter(group => !day || group.date === day).map(group => ({
    ...group,
    items: group.items.filter(payment => !query || normalize([
      payment.supplier_name, payment.concept, payment.invoice_number, payment.notes, payment.staff_name,
    ].filter(Boolean).join(' ')).includes(query)),
  })).filter(group => group.items.length > 0)
  const count = visible.reduce((sum, group) => sum + group.items.length, 0)
  const total = visible.reduce((sum, group) => sum + group.items.reduce((amount, payment) => amount + (Number(payment.amount) || 0), 0), 0)

  return (
    <section id="facturas-del-mes" className="admin-panel mb-5 scroll-mt-28 overflow-hidden" aria-label="Facturas pagadas por día">
      <div className="space-y-3 border-b border-black/10 p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-black">Facturas pagadas por día</h2>
          <p className="mt-1 text-sm font-semibold text-black/55">{monthLabel}. Cada pago aparece en su fecha, tanto de caja como por aparte.</p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="closing-bill-day" className="mb-2 block text-sm font-bold">Día de pago</label>
            <select id="closing-bill-day" value={day} onChange={event => setDay(event.target.value)} className="admin-input w-full min-w-0">
              <option value="">Todos los días del mes</option>
              {groups.map(group => <option key={group.date} value={group.date}>{formatDay(group.date)} · {group.items.length} factura(s)</option>)}
            </select>
          </div>
          <label className="min-w-0 text-sm font-bold">
            <span className="mb-2 block">Buscar factura pagada</span>
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Proveedor, concepto, número o notas" className="admin-input w-full min-w-0" />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold" aria-live="polite">{count} factura{count === 1 ? '' : 's'} · Total mostrado: {money(total)}</p>
          {(day || search) && <button type="button" className="admin-button-secondary" onClick={() => { setDay(''); setSearch('') }}>Ver todo el mes</button>}
        </div>
      </div>
      {visible.length === 0 && <p className="admin-empty m-4">{payments.length ? 'No hay facturas con estos filtros.' : 'No hay facturas pagadas en este mes.'}</p>}
      {visible.map(group => (
        <div key={group.date} role="group" aria-label={`Facturas del ${formatDay(group.date)}`} className="border-b border-black/10 last:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-black/[0.025] px-4 py-3">
            <h3 className="flex items-center gap-2 font-black"><CalendarDays className="size-4 shrink-0" />{formatDay(group.date)}</h3>
            <p className="text-sm font-bold">{group.items.length} factura{group.items.length === 1 ? '' : 's'} · {money(group.items.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0))}</p>
          </div>
          <div className="divide-y divide-black/8">
            {group.items.map((payment, index) => (
              <article key={payment.id || `${group.date}:${index}`} className="grid min-w-0 gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 break-words">
                  <p className="font-black">{payment.supplier_name || payment.concept || 'Factura pagada'}</p>
                  {payment.concept && <p className="mt-1 text-sm font-semibold text-black/55">{payment.concept}</p>}
                  {payment.invoice_number && <p className="mt-1 text-sm font-bold text-black/55">Factura: {payment.invoice_number}</p>}
                  {payment.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-black/55">{payment.notes}</p>}
                  {payment.staff_name && <p className="mt-1 text-xs font-bold text-black/45">Registrado por: {payment.staff_name}</p>}
                  <p className="mt-2 text-xs font-black text-black/55">{payment.payment_method === 'external' ? 'Por aparte' : 'Caja'}</p>
                </div>
                <p className="whitespace-nowrap font-black text-red-700">{money(-(Number(payment.amount) || 0))}</p>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
