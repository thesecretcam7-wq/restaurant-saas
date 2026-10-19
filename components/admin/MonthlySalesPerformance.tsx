'use client'

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthSalesComparison } from '@/lib/month-sales-comparison'

export default function MonthlySalesPerformance({ data, currency }: {
  data: MonthSalesComparison
  currency: { code: string; locale: string } | null
}) {
  const locale = currency?.locale || 'es-ES'
  const money = (value: number) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: currency?.code || 'EUR', maximumFractionDigits: 2,
  }).format(value)
  const date = (key: string) => new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', day: 'numeric', month: 'long',
  }).format(new Date(`${key}T12:00:00Z`))
  const month = (key: string) => new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', month: 'long', year: 'numeric',
  }).format(new Date(`${key}-01T12:00:00Z`))
  const direction = data.difference > 0 ? 'Por encima' : data.difference < 0 ? 'Por debajo' : 'Al mismo nivel'
  const differenceClass = data.difference > 0 ? 'text-emerald-600' : data.difference < 0 ? 'text-red-600' : 'text-gray-500'
  const hasSales = data.currentOrders > 0 || data.previousOrders > 0

  return (
    <section className="admin-panel mt-5 min-w-0 overflow-hidden p-4 sm:p-6" aria-labelledby="monthly-performance-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="admin-eyebrow">Rendimiento del mes</p>
          <h2 id="monthly-performance-title" className="text-xl font-bold capitalize">{month(data.currentMonth)}</h2>
        </div>
        <p className="text-sm opacity-65">Hasta el {date(data.today)}, {data.cutoffTime.slice(0, 5)}</p>
      </div>

      <dl className="my-5 grid gap-5 border-y border-current/10 py-5 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-sm opacity-65">Ventas de este mes</dt>
          <dd className="mt-1 break-words text-2xl font-bold">{money(data.currentTotal)}</dd>
          <dd className="mt-1 text-sm opacity-65">{data.currentOrders} ventas pagadas</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm opacity-65">Mes pasado hasta el {date(data.previousThrough)}</dt>
          <dd className="mt-1 break-words text-2xl font-bold">{money(data.previousTotal)}</dd>
          <dd className="mt-1 text-sm opacity-65">
            {data.previousOrders} ventas pagadas · {data.day > data.previousLastDay ? 'Mes completo' : `Hasta las ${data.cutoffTime.slice(0, 5)}`}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-sm opacity-65">{direction} del mes pasado</dt>
          <dd className={`mt-1 break-words text-2xl font-bold ${differenceClass}`}>{money(Math.abs(data.difference))}</dd>
          <dd className={`mt-1 text-sm font-semibold ${differenceClass}`}>
            {data.percentChange === null ? 'Sin ventas previas para calcular porcentaje' : `${data.percentChange > 0 ? '+' : ''}${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(data.percentChange)}%`}
          </dd>
        </div>
      </dl>

      {hasSales ? (
        <>
          <p className="mb-3 text-sm font-semibold">Ventas acumuladas por día</p>
          <div className="h-72 w-full min-w-0" role="img" aria-label={`Ventas acumuladas: este mes ${money(data.currentTotal)}, mes pasado ${money(data.previousTotal)}. ${direction}.`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data.points} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} minTickGap={20} tickLine={false} />
                <YAxis width={64} tick={{ fill: 'currentColor', fontSize: 12 }} tickLine={false}
                  tickFormatter={value => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))} />
                <Tooltip formatter={value => money(Number(value))} labelFormatter={label => `Día ${label}`}
                  contentStyle={{ background: '#fff', color: '#171717', borderRadius: 6, border: '1px solid #d4d4d4' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line dataKey="current" name={month(data.currentMonth)} stroke="#059669" strokeWidth={3}
                  dot={data.points.length === 1} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line dataKey="previous" name={month(data.previousMonth)} stroke="#db8c16" strokeWidth={2}
                  strokeDasharray="6 4" dot={data.points.length === 1} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-4 border-t border-current/10 pt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Ver importes por día</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-right text-sm">
                <caption className="sr-only">Ventas acumuladas de ambos meses hasta la fecha de comparación</caption>
                <thead><tr><th className="p-2 text-left">Día</th><th className="p-2">Este mes</th><th className="p-2">Mes pasado</th></tr></thead>
                <tbody>{data.points.map(point => (
                  <tr key={point.day} className="border-t border-current/10">
                    <th scope="row" className="p-2 text-left font-normal">{point.day}</th>
                    <td className="p-2 whitespace-nowrap">{money(point.current)}</td>
                    <td className="p-2 whitespace-nowrap">{money(point.previous)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p className="py-6 text-center text-sm opacity-65">Todavía no hay ventas pagadas en estos periodos.</p>}
    </section>
  )
}
