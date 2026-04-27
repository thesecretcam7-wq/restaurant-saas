'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NEXT_LABELS: Record<string, string> = {
  confirmed: 'Confirmar pedido',
  preparing: 'Marcar en preparación',
  ready: 'Listo para recoger',
  on_the_way: 'Marcar en camino',
  delivered: 'Marcar entregado',
}

interface Props {
  orderId: string
  tenantId: string
  currentStatus: string
  nextStatus?: string
  paymentMethod?: string
}

export default function OrderStatusActions({ orderId, tenantId, currentStatus, nextStatus, paymentMethod }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const updateStatus = async (status: string, paymentStatus?: string) => {
    setLoading(true)
    const body: Record<string, string> = { status }
    if (paymentStatus) body.payment_status = paymentStatus
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'delivered' || currentStatus === 'cancelled') return null

  const isCashPending = currentStatus === 'pending' && paymentMethod === 'cash'

  return (
    <div className="bg-white rounded-xl border p-5 flex gap-3">
      {isCashPending ? (
        <button
          onClick={() => updateStatus('confirmed', 'paid')}
          disabled={loading}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-300"
        >
          {loading ? 'Procesando...' : '💵 Cobrar y Confirmar'}
        </button>
      ) : nextStatus ? (
        <button
          onClick={() => updateStatus(nextStatus)}
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Actualizando...' : NEXT_LABELS[nextStatus]}
        </button>
      ) : null}
      {currentStatus !== 'cancelled' && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={loading}
          className="px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
