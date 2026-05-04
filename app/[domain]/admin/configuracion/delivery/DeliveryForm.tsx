'use client'

import { useState, useEffect } from 'react'

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
      if (!res.ok) { setMessage(`❌ ${data.error}`); return }
      setMessage('✅ Configuración guardada')
      setTimeout(() => setMessage(''), 3000)
    } catch { setMessage('❌ Error al guardar') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-xl border">
      {message && (
        <div className={`p-4 border-b rounded-t-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSave} className="p-6 space-y-6">

        {/* Delivery */}
        <div className="border-b pb-6">
          <h2 className="font-semibold text-gray-900 mb-4">🚗 Delivery a Domicilio</h2>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={form.delivery_enabled}
              onChange={e => setForm(f => ({ ...f, delivery_enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <span className="font-medium text-gray-700">Habilitar delivery</span>
          </label>
          {form.delivery_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-7">
              {[
                { key: 'delivery_fee', label: 'Costo de delivery ($)', hint: '0 = gratis' },
                { key: 'delivery_min_order', label: 'Pedido mínimo ($)', hint: '0 = sin mínimo' },
                { key: 'delivery_time_minutes', label: 'Tiempo estimado (min)', hint: '' },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="number" min="0" value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                  {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagos */}
        <div className="border-b pb-6">
          <h2 className="font-semibold text-gray-900 mb-4">💳 Métodos de Pago</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 rounded-lg">
              <span>💳</span>
              <div>
                <p className="text-sm font-medium text-blue-800">Tarjeta / Stripe</p>
                <p className="text-xs text-blue-600">Siempre activo — requiere Stripe Connect configurado</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg hover:bg-gray-50">
              <input type="checkbox" checked={form.cash_payment_enabled}
                onChange={e => setForm(f => ({ ...f, cash_payment_enabled: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Pago en efectivo</p>
                <p className="text-xs text-gray-500">El cliente paga al recibir el pedido</p>
              </div>
            </label>
          </div>
        </div>

        {/* IVA */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">🧾 Impuestos</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">IVA / Impuesto (%)</label>
            <input type="number" min="0" max="100" step="0.01" value={form.tax_rate}
              onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
            <p className="text-xs text-gray-400 mt-1">Ej: 19 = 19% de IVA. 0 = sin impuestos.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
