'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { addRestaurantLocalDays } from '@/lib/restaurant-time'
import { normalizeProductSearch, type ProductSale } from '@/lib/product-sales'
import { formatPriceWithCurrency } from '@/lib/currency'

interface Props {
  tenantId: string
  today: string
  currency: string
  locale: string
  updatedAt: number
}

const iconButtonStyle = { width: 40, minWidth: 40, height: 40, minHeight: 40, padding: 0, flexShrink: 0 }

export function ProductSalesReport({ tenantId, today, currency, locale, updatedAt }: Props) {
  const [date, setDate] = useState(today)
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [snapshot, setSnapshot] = useState<{ date: string; products: ProductSale[]; updatedAt: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const timeout = setTimeout(() => controller.abort(), 12_000)
    setLoading(true)
    setError('')
    void (async () => {
      try {
        if (!navigator.onLine) throw new Error('Sin conexion. Las ventas no se pueden actualizar.')
        const response = await fetch(`/api/sales/products?${new URLSearchParams({ tenantId, date })}`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las ventas por producto')
        if (data.date !== date || !Array.isArray(data.products)) throw new Error('Respuesta de ventas no valida')
        if (!cancelled) setSnapshot(data)
      } catch (failure) {
        if (!cancelled) setError(controller.signal.aborted ? 'La consulta tardo demasiado. Intenta de nuevo.' : failure instanceof Error ? failure.message : 'No se pudieron cargar las ventas')
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true; clearTimeout(timeout); controller.abort() }
  }, [tenantId, date, refresh, updatedAt])

  const current = snapshot?.date === date ? snapshot : null
  const products = useMemo(() => {
    const query = normalizeProductSearch(search)
    return (current?.products || []).filter(product => normalizeProductSearch(product.name).includes(query))
  }, [current, search])
  const money = (value: number) => formatPriceWithCurrency(value, currency, locale)
  const quantity = products.reduce((sum, product) => sum + product.quantity, 0)
  const amount = products.reduce((sum, product) => sum + product.amount, 0)

  return (
    <section className="admin-panel mt-5 overflow-hidden" aria-labelledby="product-sales-title" style={{ overflowX: 'hidden' }}>
      <div className="border-b border-black/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="product-sales-title" className="font-black text-[#15130f]">Ventas por producto</h2>
          <button type="button" title="Actualizar ventas por producto" aria-label="Actualizar ventas por producto" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="admin-button-ghost shrink-0 disabled:opacity-50" style={iconButtonStyle}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="product-sales-date" className="mb-1 block text-xs font-bold">Fecha</label>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" title="Dia anterior" aria-label="Dia anterior" onClick={() => setDate(addRestaurantLocalDays(date, -1))} className="admin-button-ghost" style={iconButtonStyle}><ChevronLeft className="size-4" /></button>
              <input id="product-sales-date" type="date" value={date} max={today} onChange={event => { if (event.target.value && event.target.value <= today) setDate(event.target.value) }} className="admin-input" style={{ width: 160, minWidth: 0, minHeight: 40, height: 40 }} />
              <button type="button" title="Dia siguiente" aria-label="Dia siguiente" disabled={date >= today} onClick={() => setDate(addRestaurantLocalDays(date, 1))} className="admin-button-ghost disabled:opacity-40" style={iconButtonStyle}><ChevronRight className="size-4" /></button>
              <button type="button" onClick={() => setDate(today)} disabled={date === today} className="admin-button-ghost disabled:opacity-40" style={{ width: 'auto', minHeight: 40, height: 40, padding: '0 0.5rem' }}><CalendarDays className="size-4" />Hoy</button>
            </div>
          </div>
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="product-sales-search" className="mb-1 block text-xs font-bold">Producto</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-black/45" />
              <input id="product-sales-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar producto" className="admin-input h-10 w-full min-w-0" style={{ paddingLeft: 36 }} />
            </div>
          </div>
        </div>
      </div>
      {loading ? <p role="status" className="p-5 text-sm">Cargando ventas del dia...</p> : error ? (
        <div role="alert" className="p-5 text-sm text-red-700">{error}<button type="button" onClick={() => setRefresh(value => value + 1)} className="admin-button-ghost ml-2"><RefreshCw className="size-4" />Reintentar</button></div>
      ) : current && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b border-black/10 px-4 py-3 text-sm sm:px-5" aria-live="polite">
            <span>{products.length} productos</span>
            <span><strong>{quantity.toLocaleString(locale)}</strong> unidades</span>
            <span>Importe de productos: <strong>{money(amount)}</strong></span>
          </div>
          {products.length === 0 ? <p className="p-5 text-sm">{search ? 'No hay productos que coincidan con la busqueda.' : 'No hay ventas cobradas para esta fecha.'}</p> : (
            <table className="w-full table-fixed text-sm" style={{ minWidth: 0 }}>
              <colgroup><col /><col className="w-20 sm:w-28" /><col className="w-24 sm:w-36" /></colgroup>
              <thead className="text-xs uppercase"><tr><th className="sales-muted px-4 py-3 text-left sm:px-5">Producto</th><th className="sales-muted px-2 py-3 text-right">Unidades</th><th className="sales-muted px-4 py-3 text-right sm:px-5">Importe</th></tr></thead>
              <tbody className="divide-y divide-black/8">{products.map(product => <tr key={product.key}><td className="sales-muted break-words px-4 py-3 font-bold sm:px-5">{product.name}</td><td className="sales-muted px-2 py-3 text-right tabular-nums">{product.quantity.toLocaleString(locale)}</td><td className="sales-muted break-words px-4 py-3 text-right tabular-nums sm:px-5">{money(product.amount)}</td></tr>)}</tbody>
            </table>
          )}
          <div className="flex flex-wrap justify-between gap-2 border-t border-black/10 px-4 py-3 text-xs sm:px-5">
            <span>Antes de descuentos generales del ticket, sin propinas ni reparto.</span>
            <span>Actualizado: {new Date(current.updatedAt).toLocaleTimeString(locale)}</span>
          </div>
        </>
      )}
    </section>
  )
}
