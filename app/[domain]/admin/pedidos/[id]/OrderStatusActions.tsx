'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NEXT_LABELS: Record<string, string> = {
  confirmed: 'Confirmar pedido',
  preparing: 'Marcar en preparación',
  on_the_way: 'Marcar en camino',
  delivered: 'Marcar entregado',
}

interface Props {
  orderId: string
  tenantId: string
  currentStatus: string
  nextStatus?: string
}

export default function OrderStatusActions({ orderId, tenantId, currentStatus, nextStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const updateStatus = async (status: string) => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'delivered' || currentStatus === 'cancelled') return null

  return (
    <div className="bg-white rounded-xl border p-5 flex gap-3">
      {nextStatus && (
        <button
          onClick={() => updateStatus(nextStatus)}
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Actualizando...' : NEXT_LABELS[nextStatus]}
        </button>
      )}
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
