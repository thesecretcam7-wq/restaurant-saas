'use client'

import { useEffect, useState } from 'react'

export function WompiReturnVerifier({
  orderId,
  reference,
  transactionId,
}: {
  orderId?: string
  reference?: string
  transactionId?: string
}) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'paid' | 'pending' | 'failed'>('idle')

  useEffect(() => {
    if (!transactionId || (!orderId && !reference)) return
    let cancelled = false

    setStatus('checking')
    fetch('/api/wompi/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reference, transactionId }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setStatus(data.payment_status === 'paid' ? 'paid' : data.payment_status === 'failed' ? 'failed' : 'pending')
      })
      .catch(() => {
        if (!cancelled) setStatus('pending')
      })

    return () => {
      cancelled = true
    }
  }, [orderId, reference, transactionId])

  if (!transactionId) return null

  const copy = {
    checking: 'Verificando pago con Wompi...',
    paid: 'Pago Wompi confirmado',
    pending: 'Pago Wompi pendiente de confirmacion',
    failed: 'Pago Wompi no aprobado',
    idle: '',
  }[status]

  return (
    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800">
      {copy}
    </p>
  )
}
