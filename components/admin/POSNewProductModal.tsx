'use client'

import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Keyboard, Plus, X } from 'lucide-react'
import { NumericKeyboard } from './NumericKeyboard'
import { TextKeyboard } from './TextKeyboard'
import { formatPriceWithCurrency } from '@/lib/currency'

export interface CreatedPOSProduct {
  id: string
  name: string
  price: number
  category_id: string
  image_url?: string
  available: boolean
  sort_order?: number
}

export function POSNewProductModal({ tenantId, categories, initialCategoryId, currency, getToken, onCreated, onClose, portalTarget }: {
  tenantId: string
  categories: { id: string; name: string }[]
  initialCategoryId?: string | null
  currency: { code: string; locale: string }
  getToken: () => Promise<string>
  onCreated: (item: CreatedPOSProduct, warning?: string) => void
  onClose: () => void
  portalTarget: Element | null
}) {
  const titleId = useId()
  const [requestId] = useState(() => crypto.randomUUID())
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState(initialCategoryId || categories[0]?.id || '')
  const [showInStore, setShowInStore] = useState(false)
  const [keyboard, setKeyboard] = useState<'name' | 'price' | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  async function save() {
    if (inFlight.current) return
    if (name.trim().length < 3 || price === null || price <= 0 || !categoryId) {
      setError('Completa el nombre (minimo 3 letras), un precio mayor que cero y la categoria.')
      return
    }
    if (!navigator.onLine) { setError('Necesitas conexion para guardar el producto.'); return }
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      const token = await getToken()
      const response = await fetch('/api/pos/products', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        body: JSON.stringify({ tenantId, requestId, name: name.trim(), price, categoryId, showInStore }),
        signal: AbortSignal.timeout(30_000),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el producto')
      if (!data.item?.id) throw new Error('No se pudo confirmar el guardado. Reintenta desde este formulario.')
      onCreated({ ...data.item, price: Number(data.item.price), image_url: data.item.image_url || undefined }, data.warning)
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'TypeError'
        ? cause.message : 'No se pudo confirmar el guardado. Reintenta desde este formulario para evitar duplicados.')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  if (!portalTarget) return null
  const fieldClass = 'flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-white/20 bg-black/20 px-3 py-3 text-left text-base font-semibold text-white disabled:opacity-50'
  return <>
    {createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-3">
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={saving}
          className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-white/20 bg-[#171c28] text-white shadow-2xl">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-4">
            <h2 id={titleId} className="text-lg font-bold">Nuevo producto</h2>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar nuevo producto" title="Cerrar"
              className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-white/10 disabled:opacity-50"><X className="size-5" /></button>
          </header>
          <form className="min-h-0 overflow-y-auto p-4" onSubmit={event => { event.preventDefault(); void save() }}>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-sm font-semibold">Nombre</p>
                <button type="button" aria-label="Nombre del producto" className={fieldClass} disabled={saving}
                  onClick={() => { setDraft(name); setKeyboard('name') }}>
                  <span className="min-w-0 break-words">{name || 'Nombre del producto'}</span><Keyboard className="size-5 shrink-0" />
                </button>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold">Precio</p>
                <button type="button" aria-label="Precio del producto" className={fieldClass} disabled={saving} onClick={() => setKeyboard('price')}>
                  <span>{price === null ? 'Precio' : formatPriceWithCurrency(price, currency.code, currency.locale)}</span><Keyboard className="size-5 shrink-0" />
                </button>
              </div>
              <label className="block text-sm font-semibold">Categoria
                <select aria-label="Categoria" className={`${fieldClass} mt-1`} value={categoryId} disabled={saving} required onChange={event => setCategoryId(event.target.value)}>
                  <option value="" className="bg-[#171c28]">Selecciona una categoria</option>
                  {categories.map(category => <option key={category.id} value={category.id} className="bg-[#171c28]">{category.name}</option>)}
                </select>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={showInStore} disabled={saving} onChange={event => setShowInStore(event.target.checked)} className="size-5 accent-emerald-500" />
                Mostrar en carta QR
              </label>
              {error && <p role="alert" className="rounded-lg border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
              <button type="submit" disabled={saving || !categories.length}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-bold text-black disabled:opacity-50">
                <Plus className="size-5" />{saving ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </section>
      </div>, portalTarget)}
    <TextKeyboard isOpen={keyboard === 'name'} title="Nombre del producto" value={draft} onChange={setDraft} maxLength={100} compact extraCharacters
      onConfirm={() => { setName(draft); setKeyboard(null) }} onCancel={() => setKeyboard(null)} />
    <NumericKeyboard isOpen={keyboard === 'price'} title="Precio del producto" initialValue={price || 0} allowDecimal maxLength={9} compact
      onConfirm={value => { setPrice(Math.round(value * 100) / 100); setKeyboard(null) }} onCancel={() => setKeyboard(null)} />
  </>
}
