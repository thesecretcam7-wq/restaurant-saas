'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type VoidSaleButtonProps = {
  orderId: string
  orderNumber?: string | null
  disabled?: boolean
}

export function VoidSaleButton({ orderId, orderNumber, disabled }: VoidSaleButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function voidSale() {
    const label = orderNumber || 'esta venta'
    const reason = window.prompt(`Motivo para anular ${label}:`)

    if (reason === null) return
    if (!reason.trim()) {
      window.alert('Debes escribir un motivo para anular la venta.')
      return
    }

    const confirmed = window.confirm(
      `Anular ${label}?\n\nLa venta quedara registrada como anulada y no contara en ventas netas.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancel_reason: `Venta anulada: ${reason.trim()}`,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo anular la venta')

      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo anular la venta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={voidSale}
      disabled={disabled || loading}
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? 'Anulando...' : 'Anular venta'}
    </button>
  )
}
