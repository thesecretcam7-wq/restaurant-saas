'use client'

import { useEffect, useState } from 'react'
import { Bike, Plus, Save, Trash2 } from 'lucide-react'

interface Props { tenantId: string }

interface DeliveryZone {
  id: string
  name: string
  fee: string
  min_order: string
}

export default function DeliveryForm({ tenantId }: Props) {
  const [form, setForm] = useState({
    delivery_enabled: false,
    delivery_fee: '0',
    delivery_min_order: '0',
    delivery_time_minutes: '30',
    cash_payment_enabled: true,
    tax_rate: '0',
    country: 'ES',
    online_payment_provider: 'stripe',
    wompi_enabled: false,
    wompi_environment: 'sandbox',
    wompi_public_key: '',
    wompi_private_key: '',
    wompi_integrity_key: '',
    wompi_has_private_key: false,
    wompi_has_integrity_key: false,
    delivery_zones: [] as DeliveryZone[],
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
            country: data.data.country ?? 'ES',
            online_payment_provider: data.data.online_payment_provider ?? 'stripe',
            wompi_enabled: data.data.wompi_enabled ?? false,
            wompi_environment: data.data.wompi_environment ?? 'sandbox',
            wompi_public_key: data.data.wompi_public_key ?? '',
            wompi_private_key: '',
            wompi_integrity_key: '',
            wompi_has_private_key: data.data.wompi_has_private_key ?? false,
            wompi_has_integrity_key: data.data.wompi_has_integrity_key ?? false,
            delivery_zones: Array.isArray(data.data.delivery_zones)
              ? data.data.delivery_zones.map((zone: any, index: number) => ({
                id: String(zone.id || `zona-${index + 1}`),
                name: String(zone.name || ''),
                fee: String(zone.fee ?? 0),
                min_order: String(zone.min_order ?? 0),
              }))
              : [],
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
      setMessage('Delivery guardado')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const addZone = () => {
    setForm(f => ({
      ...f,
      delivery_zones: [
        ...f.delivery_zones,
        {
          id: `zona-${Date.now()}`,
          name: '',
          fee: '0',
          min_order: '0',
        },
      ],
    }))
  }

  const updateZone = (id: string, key: keyof Omit<DeliveryZone, 'id'>, value: string) => {
    setForm(f => ({
      ...f,
      delivery_zones: f.delivery_zones.map(zone =>
        zone.id === id ? { ...zone, [key]: value } : zone
      ),
    }))
  }

  const removeZone = (id: string) => {
    setForm(f => ({
      ...f,
      delivery_zones: f.delivery_zones.filter(zone => zone.id !== id),
    }))
  }

  if (loading) {
    return <div className="admin-empty min-h-48">Cargando configuracion de delivery...</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Delivery</p>
          <h1 className="admin-title">Domicilios</h1>
          <p className="admin-subtitle">Activa el servicio, define tarifa, pedido minimo y tiempo estimado.</p>
        </div>
      </div>

      <form method="post" onSubmit={handleSave} className="admin-panel overflow-hidden">
        {message && (
          <div className={`border-b px-5 py-4 text-sm font-black ${message.startsWith('Delivery') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <section className="space-y-5 p-5">
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
              { key: 'delivery_fee', label: 'Monto delivery', helper: 'Ej: 4000 o 4.50' },
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

          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-[#15130f]">Zonas de delivery</h3>
                <p className="mt-1 text-sm font-semibold text-black/45">
                  Si agregas zonas, el TPV dejara escoger una zona y usara su precio.
                </p>
              </div>
              <button
                type="button"
                onClick={addZone}
                className="inline-flex items-center gap-2 rounded-xl bg-[#15130f] px-4 py-2 text-sm font-black text-white transition hover:bg-black"
              >
                <Plus className="size-4" />
                Agregar
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.delivery_zones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/15 bg-white px-4 py-5 text-sm font-semibold text-black/45">
                  Sin zonas. El TPV usara el monto delivery general.
                </div>
              ) : (
                form.delivery_zones.map((zone) => (
                  <div key={zone.id} className="grid gap-3 rounded-xl border border-black/10 bg-white p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-black/42">Zona</span>
                      <input
                        type="text"
                        value={zone.name}
                        onChange={e => updateZone(zone.id, 'name', e.target.value)}
                        placeholder="Centro, Norte, Kennedy..."
                        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase text-black/42">Precio</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={zone.fee}
                        onChange={e => updateZone(zone.id, 'fee', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase text-black/42">Minimo</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={zone.min_order}
                        onChange={e => updateZone(zone.id, 'min_order', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeZone(zone.id)}
                      className="mt-6 flex h-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-red-700 transition hover:bg-red-100"
                      title="Eliminar zona"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end border-t border-black/10 p-5">
          <button type="submit" disabled={saving} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="size-4" />
            {saving ? 'Guardando...' : 'Guardar delivery'}
          </button>
        </div>
      </form>
    </div>
  )
}
