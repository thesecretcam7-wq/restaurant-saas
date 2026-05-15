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
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const checkPayment = () => {
      attempts += 1
      setStatus('checking')
      fetch('/api/wompi/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reference, transactionId }),
      })
        .then(res => res.json())
        .then(data => {
          if (cancelled) return
          const nextStatus = data.payment_status === 'paid' ? 'paid' : data.payment_status === 'failed' ? 'failed' : 'pending'
          setStatus(nextStatus)
          if (nextStatus === 'pending' && attempts < 24) {
            timer = setTimeout(checkPayment, 5000)
          }
        })
        .catch(() => {
          if (cancelled) return
          setStatus('pending')
          if (attempts < 24) timer = setTimeout(checkPayment, 5000)
        })
    }

    checkPayment()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [orderId, reference, transactionId])

  if (!transactionId) return null

  const copy = {
    checking: 'Verificando pago con Nequi...',
    paid: 'Pago Nequi confirmado',
    pending: 'Pago Nequi pendiente. Acepta la notificacion en tu app Nequi.',
    failed: 'Pago Wompi no aprobado',
    idle: '',
  }[status]

  return (
    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-800">
      {copy}
    </p>
  )
}
