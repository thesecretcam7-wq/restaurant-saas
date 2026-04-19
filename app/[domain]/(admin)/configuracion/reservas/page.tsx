'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface ReservasForm {
  reservations_enabled: boolean
  total_tables: string
  seats_per_table: string
  reservation_advance_hours: string
}

const DEFAULTS: ReservasForm = {
  reservations_enabled: false,
  total_tables: '10',
  seats_per_table: '4',
  reservation_advance_hours: '24',
}

export default function ReservasConfigPage() {
  const params = useParams()
  const tenantSlug = params.domain as string

  const [form, setForm] = useState<ReservasForm>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/tenant/reservas?tenantSlug=${tenantSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setForm({
            reservations_enabled: data.data.reservations_enabled ?? false,
            total_tables: String(data.data.total_tables ?? 10),
            seats_per_table: String(data.data.seats_per_table ?? 4),
            reservation_advance_hours: String(data.data.reservation_advance_hours ?? 24),
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
      const response = await fetch('/api/tenant/reservas', {
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

  const totalCapacity = Number(form.total_tables) * Number(form.seats_per_table)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {message && (
        <div className={`p-4 border-b border-gray-200 rounded-t-xl ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 space-y-6">
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Sistema de Reservas</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.reservations_enabled}
              onChange={e => setForm(f => ({ ...f, reservations_enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="font-medium text-gray-700">Habilitar sistema de reservas de mesas</span>
          </label>
        </div>

        {form.reservations_enabled && (
          <>
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🪑 Capacidad del Local</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Mesas</label>
                  <input
                    type="number"
                    min="1"
                    value={form.total_tables}
                    onChange={e => setForm(f => ({ ...f, total_tables: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asientos por Mesa</label>
                  <input
                    type="number"
                    min="1"
                    value={form.seats_per_table}
                    onChange={e => setForm(f => ({ ...f, seats_per_table: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {totalCapacity > 0 && (
                <p className="text-sm text-gray-600 mt-3">
                  Capacidad total: <strong>{totalCapacity} personas</strong>
                </p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">⏰ Políticas de Reserva</h2>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anticipación mínima para reservar (horas)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.reservation_advance_hours}
                  onChange={e => setForm(f => ({ ...f, reservation_advance_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ej: 24 = los clientes deben reservar con al menos 24 horas de anticipación.
                </p>
              </div>
            </div>
          </>
        )}

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
