'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Edit3, Minus, Trash2, X } from 'lucide-react'

type SaleItem = {
  menu_item_id?: string | null
  item_id?: string | null
  id?: string | null
  name: string
  price: number
  qty?: number
  quantity?: number
  notes?: string | null
}

type EditSaleButtonProps = {
  tenantId: string
  orderId: string
  orderNumber?: string | null
}

function getItemId(item: SaleItem, index: number) {
  return item.menu_item_id || item.item_id || item.id || `line-${index}`
}

function getQuantity(item: SaleItem) {
  const quantity = Number(item.qty ?? item.quantity ?? 1)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

export function EditSaleButton({ tenantId, orderId, orderNumber }: EditSaleButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [originalItems, setOriginalItems] = useState<SaleItem[]>([])
  const [reason, setReason] = useState('')

  const originalTotal = useMemo(
    () => originalItems.reduce((sum, item) => sum + Number(item.price || 0) * getQuantity(item), 0),
    [originalItems]
  )
  const editedTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * getQuantity(item), 0),
    [items]
  )
  const refundEstimate = Math.max(0, originalTotal - editedTotal)

  async function openEditor() {
    setOpen(true)
    setLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, { credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la venta')

      const loadedItems = Array.isArray(data.order?.items) ? data.order.items : []
      setItems(loadedItems)
      setOriginalItems(loadedItems)
      setReason('')
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo cargar la venta')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  function reduceItem(index: number) {
    setItems((current) =>
      current.flatMap((item, itemIndex) => {
        if (itemIndex !== index) return [item]
        const quantity = getQuantity(item)
        if (quantity <= 1) return []
        return [{ ...item, qty: quantity - 1, quantity: undefined }]
      })
    )
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function saveChanges() {
    if (items.length === 0) {
      window.alert('La venta debe conservar al menos un producto. Para quitar todo, anula la venta completa.')
      return
    }

    if (!reason.trim()) {
      window.alert('Escribe el motivo de la edicion.')
      return
    }

    const confirmed = window.confirm(
      `Guardar cambios en ${orderNumber || 'esta venta'}?\n\nSe actualizara el total y se devolvera al inventario lo que quitaste.`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          items: items.map((item, index) => ({
            menu_item_id: getItemId(item, index),
            qty: getQuantity(item),
            notes: item.notes || null,
          })),
          edit_reason: reason.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo editar la venta')

      setOpen(false)
      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo editar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
      >
        <Edit3 className="size-3.5" />
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div>
                <h2 className="text-base font-black text-[#15130f]">Editar venta</h2>
                <p className="text-xs font-bold text-black/45">{orderNumber || orderId}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {loading ? (
                <p className="py-8 text-center text-sm font-bold text-black/45">Cargando venta...</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const quantity = getQuantity(item)
                    return (
                      <div key={`${getItemId(item, index)}-${index}`} className="flex items-center gap-3 rounded-lg border border-black/10 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#15130f]">{item.name}</p>
                          <p className="text-xs font-bold text-black/45">
                            {quantity} x ${Number(item.price || 0).toLocaleString('es-CO')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => reduceItem(index)}
                          className="rounded-lg border border-black/10 p-2 text-black/70 transition hover:bg-black/5"
                          title="Quitar una unidad"
                        >
                          <Minus className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                          title="Eliminar producto"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )
                  })}

                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/45">Motivo</span>
                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      className="mt-1 min-h-20 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      placeholder="Ej: cliente pidio retirar una bebida de la factura"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="font-black text-[#15130f]">Nuevo total: ${editedTotal.toLocaleString('es-CO')}</p>
                <p className="text-xs font-bold text-black/45">Diferencia aprox.: ${refundEstimate.toLocaleString('es-CO')}</p>
              </div>
              <button
                type="button"
                onClick={saveChanges}
                disabled={loading || saving}
                className="rounded-lg bg-[#15130f] px-4 py-2 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
