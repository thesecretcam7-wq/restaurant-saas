'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

interface Props {
  tenantId: string
  tenantSlug: string
  isPending: boolean
}

export function StripeConnectClient({ tenantId, tenantSlug, isPending }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connectStripe() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, domain: tenantSlug }),
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'No se pudo abrir Stripe')
      }

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error conectando Stripe')
      setLoading(false)
    }
  }

  return (
    <div className="admin-panel p-5">
      <h2 className="text-lg font-black text-[#15130f]">
        {isPending ? 'Completar verificacion' : 'Conectar Stripe'}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
        Te llevamos a Stripe para crear o vincular la cuenta del restaurante. Al terminar, vuelves automaticamente a Eccofood.
      </p>
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={connectStripe}
        disabled={loading}
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#635BFF] px-5 text-sm font-black text-white shadow-lg shadow-indigo-900/15 transition hover:bg-[#5148f0] disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
        {loading ? 'Abriendo Stripe...' : isPending ? 'Continuar en Stripe' : 'Conectar con Stripe'}
      </button>
    </div>
  )
}
