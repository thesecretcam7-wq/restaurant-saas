'use client'

import { useState } from 'react'
import { Store } from 'lucide-react'

interface StoreStatusToggleProps {
  tenantId: string
  initialEnabled: boolean
}

export function StoreStatusToggle({ tenantId, initialEnabled }: StoreStatusToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)

  async function toggleStore() {
    const nextEnabled = !enabled
    setEnabled(nextEnabled)
    setSaving(true)

    try {
      const res = await fetch('/api/tenant/store-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, store_enabled: nextEnabled }),
      })

      if (!res.ok) throw new Error('No se pudo guardar')
    } catch {
      setEnabled(!nextEnabled)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleStore}
      disabled={saving}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-left transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-70"
      title={enabled ? 'La tienda esta activa' : 'La tienda esta desactivada'}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Store className={`size-4 flex-shrink-0 ${enabled ? 'text-emerald-300' : 'text-red-300'}`} />
        <span className="min-w-0">
          <span className="block truncate text-xs font-black text-white">
            {saving ? 'Guardando...' : enabled ? 'Tienda activa' : 'Tienda desactivada'}
          </span>
          <span className="block truncate text-[11px] font-semibold text-white/42">
            {enabled ? 'Clientes pueden ordenar' : 'Oculta la tienda online'}
          </span>
        </span>
      </span>

      <span
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${enabled ? 'bg-emerald-400' : 'bg-white/18'}`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${enabled ? 'left-6' : 'left-1'}`}
        />
      </span>
    </button>
  )
}
