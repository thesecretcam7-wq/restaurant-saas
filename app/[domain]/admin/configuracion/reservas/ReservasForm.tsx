'use client'

import { useEffect, useState } from 'react'

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
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    fetch(`/api/tenant/reservas?tenantId=${tenantId}`, { credentials: 'include' })
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
    setMessageType(null)

    try {
      const res = await fetch('/api/tenant/reservas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, ...form }),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'No se pudieron guardar los cambios')
        setMessageType('error')
        return
      }

      setMessage('Configuracion guardada correctamente')
      setMessageType('success')
      setTimeout(() => {
        setMessage('')
        setMessageType(null)
      }, 6000)
    } catch {
      setMessage('Error al guardar. Revisa la conexion e intenta otra vez.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  const capacity = Number(form.total_tables) * Number(form.seats_per_table)

  return (
    <div className="rounded-xl border bg-white">
      {message && (
        <div
          className={`rounded-t-xl border-b p-4 text-sm font-bold ${
            messageType === 'success'
              ? 'border-green-100 bg-green-50 text-green-800'
              : 'border-red-100 bg-red-50 text-red-800'
          }`}
          role="status"
          aria-live="polite"
        >
          {messageType === 'success' ? 'Guardado: ' : 'Error: '}{message}
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-6 p-6">
        <div className="border-b pb-6">
          <h2 className="mb-4 font-semibold text-gray-900">Sistema de Reservas</h2>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.reservations_enabled}
              onChange={e => setForm(f => ({ ...f, reservations_enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="font-medium text-gray-700">Habilitar reservas de mesas</span>
          </label>
        </div>

        {form.reservations_enabled && (
          <>
            <div className="border-b pb-6">
              <h2 className="mb-4 font-semibold text-gray-900">Capacidad</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Numero de mesas</label>
                  <input
                    type="number"
                    min="1"
                    value={form.total_tables}
                    onChange={e => setForm(f => ({ ...f, total_tables: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Asientos por mesa</label>
                  <input
                    type="number"
                    min="1"
                    value={form.seats_per_table}
                    onChange={e => setForm(f => ({ ...f, seats_per_table: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {capacity > 0 && (
                <p className="mt-3 text-sm text-gray-500">
                  Capacidad total: <strong className="text-gray-800">{capacity} personas</strong>
                </p>
              )}
            </div>

            <div>
              <h2 className="mb-4 font-semibold text-gray-900">Politica</h2>
              <div className="max-w-xs">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Anticipacion minima para reservar (horas)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.reservation_advance_hours}
                  onChange={e => setForm(f => ({ ...f, reservation_advance_hours: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Ej: 24 = reservar con al menos 1 dia de anticipacion
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
