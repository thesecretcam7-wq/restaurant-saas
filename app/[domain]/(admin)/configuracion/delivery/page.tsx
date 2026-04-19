'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface DeliveryForm {
  delivery_enabled: boolean
  delivery_fee: string
  delivery_min_order: string
  delivery_time_minutes: string
  cash_payment_enabled: boolean
  tax_rate: string
}

const DEFAULTS: DeliveryForm = {
  delivery_enabled: false,
  delivery_fee: '0',
  delivery_min_order: '0',
  delivery_time_minutes: '30',
  cash_payment_enabled: true,
  tax_rate: '0',
}

export default function DeliveryConfigPage() {
  const params = useParams()
  const tenantSlug = params.domain as string

  const [form, setForm] = useState<DeliveryForm>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/tenant/delivery?tenantSlug=${tenantSlug}`)
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
  }, [tenantSlug])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/tenant/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug, ...form }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Error al guardar'}`)
        return
      }
      setMessage('✅ ' + (data.message || 'Configuración guardada'))
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('❌ Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {message && (
        <div className={`p-4 border-b border-gray-200 rounded-t-xl ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {/* Delivery */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🚗 Delivery a Domicilio</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.delivery_enabled}
                onChange={e => setForm(f => ({ ...f, delivery_enabled: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="font-medium text-gray-700">Habilitar delivery a domicilio</span>
            </label>

            {form.delivery_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Delivery ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.delivery_fee}
                    onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = delivery gratis</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pedido Mínimo ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.delivery_min_order}
                    onChange={e => setForm(f => ({ ...f, delivery_min_order: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = sin mínimo</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Estimado (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.delivery_time_minutes}
                    onChange={e => setForm(f => ({ ...f, delivery_time_minutes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagos */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">💳 Métodos de Pago</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-600">💳</span>
              <div>
                <p className="font-medium text-blue-800">Pago con tarjeta (Stripe)</p>
                <p className="text-xs text-blue-600">Siempre habilitado. Requiere configurar Stripe Connect.</p>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.cash_payment_enabled}
                onChange={e => setForm(f => ({ ...f, cash_payment_enabled: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">
                <strong>Pago en efectivo</strong>
                <p className="text-sm text-gray-500">Permitir que los clientes paguen en efectivo al recibir</p>
              </span>
            </label>
          </div>
        </div>

        {/* Impuestos */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🧾 Impuestos</h2>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de IVA / Impuesto (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.tax_rate}
              onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">0 = sin impuestos. Ej: 19 para el 19% de IVA.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
