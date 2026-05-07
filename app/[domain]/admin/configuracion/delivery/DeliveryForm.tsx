'use client'

import { useEffect, useState } from 'react'
import { Bike, CreditCard, ReceiptText, Save } from 'lucide-react'

interface Props { tenantId: string }

export default function DeliveryForm({ tenantId }: Props) {
  const [form, setForm] = useState({
    delivery_enabled: false,
    delivery_fee: '0',
    delivery_min_order: '0',
    delivery_time_minutes: '30',
    cash_payment_enabled: true,
    tax_rate: '0',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/tenant/delivery?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setForm({
            delivery_enabled: data.data.delivery_enabled ?? false,
            delivery_fee: String(data.data.delivery_fee ?? 0),
            delivery_min_order: String(data.data.delivery_min_order ?? 0),
            delivery_time_minutes: String(data.data.delivery_time_minutes ?? 30),
            cash_payment_enabled: data.data.cash_payment_enabled ?? true,
            tax_rate: String(data.data.tax_rate ?? 0),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/tenant/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Error: ${data.error || 'No se pudo guardar'}`)
        return
      }
      setMessage('Configuracion guardada')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-empty min-h-48">Cargando configuracion de delivery...</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Delivery y pagos</p>
          <h1 className="admin-title">Delivery</h1>
          <p className="admin-subtitle">Activa domicilios, efectivo, minimo de pedido e impuestos sin complicar al cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-panel overflow-hidden">
        {message && (
          <div className={`border-b px-5 py-4 text-sm font-black ${message.startsWith('Configuracion') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5 border-b border-black/10 p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <Bike className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-black text-[#15130f]">Delivery a domicilio</h2>
                <p className="mt-1 text-sm font-semibold text-black/45">Estos valores se muestran en la tienda y se suman al pedido.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.delivery_enabled}
                  onChange={e => setForm(f => ({ ...f, delivery_enabled: e.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-7 w-12 rounded-full bg-black/15 transition peer-checked:bg-[#15130f]" />
                <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: 'delivery_fee', label: 'Monto delivery', helper: 'Ej: 4.50 o 4,50' },
                { key: 'delivery_min_order', label: 'Pedido minimo', helper: '0 = sin minimo' },
                { key: 'delivery_time_minutes', label: 'Tiempo min.', helper: 'Ej: 30' },
              ].map(({ key, label, helper }) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-black/42">{label}</span>
                  <input
                    type="text"
                    inputMode={key === 'delivery_time_minutes' ? 'numeric' : 'decimal'}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                  />
                  <span className="mt-1 block text-xs font-semibold text-black/35">{helper}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-6 p-5">
            <div className="flex gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <CreditCard className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-black text-[#15130f]">Metodos de pago</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4">
                    <p className="text-sm font-black text-[#15130f]">Tarjeta / Stripe</p>
                    <p className="mt-1 text-xs font-semibold text-black/45">Activo cuando Stripe Connect este configurado.</p>
                  </div>
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white p-4">
                    <span>
                      <span className="block text-sm font-black text-[#15130f]">Pago en efectivo</span>
                      <span className="text-xs font-semibold text-black/45">El cliente paga al recibir el pedido.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.cash_payment_enabled}
                      onChange={e => setForm(f => ({ ...f, cash_payment_enabled: e.target.checked }))}
                      className="size-5"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <ReceiptText className="size-5" />
              </span>
              <label className="flex-1">
                <span className="font-black text-[#15130f]">IVA / Impuesto (%)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                />
                <span className="mt-1 block text-xs font-semibold text-black/35">Ej: 21 para IVA de Espana. 0 = sin impuestos.</span>
              </label>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-black/10 p-5">
          <button type="submit" disabled={saving} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="size-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
