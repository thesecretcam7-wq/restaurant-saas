'use client'

import { useState, useEffect } from 'react'

interface Props { tenantId: string }

export default function ReservasForm({ tenantId }: Props) {
  const [form, setForm] = useState({
    reservations_enabled: false,
    total_tables: '10',
    seats_per_table: '4',
    reservation_advance_hours: '24',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/tenant/reservas?tenantId=${tenantId}`)
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
  }, [tenantId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/tenant/reservas', {
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

  const capacity = Number(form.total_tables) * Number(form.seats_per_table)

  return (
    <div className="bg-white rounded-xl border">
      {message && (
        <div className={`p-4 border-b rounded-t-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSave} className="p-6 space-y-6">

        <div className="border-b pb-6">
          <h2 className="font-semibold text-gray-900 mb-4">📅 Sistema de Reservas</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.reservations_enabled}
              onChange={e => setForm(f => ({ ...f, reservations_enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600" />
            <span className="font-medium text-gray-700">Habilitar reservas de mesas</span>
          </label>
        </div>

        {form.reservations_enabled && (
          <>
            <div className="border-b pb-6">
              <h2 className="font-semibold text-gray-900 mb-4">🪑 Capacidad</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de mesas</label>
                  <input type="number" min="1" value={form.total_tables}
                    onChange={e => setForm(f => ({ ...f, total_tables: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asientos por mesa</label>
                  <input type="number" min="1" value={form.seats_per_table}
                    onChange={e => setForm(f => ({ ...f, seats_per_table: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              {capacity > 0 && (
                <p className="text-sm text-gray-500 mt-3">Capacidad total: <strong className="text-gray-800">{capacity} personas</strong></p>
              )}
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-4">⏰ Política</h2>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">Anticipación mínima para reservar (horas)</label>
                <input type="number" min="0" value={form.reservation_advance_hours}
                  onChange={e => setForm(f => ({ ...f, reservation_advance_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Ej: 24 = reservar con al menos 1 día de anticipación</p>
              </div>
            </div>
          </>
        )}

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
