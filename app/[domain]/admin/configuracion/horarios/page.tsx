'use client'

import { useState, useEffect, use } from 'react'

interface Props { params: Promise<{ domain: string }> }

const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
]

type DaySchedule = { open: string; close: string; enabled: boolean }
type Schedule = Record<string, DaySchedule>

const DEFAULT_SCHEDULE: Schedule = Object.fromEntries(
  DAYS.map(d => [d.key, { open: '08:00', close: '22:00', enabled: d.key !== 'sunday' }])
)

export default function HorariosPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/tenant/horarios?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.operating_hours) {
          const hours = data.data.operating_hours
          const merged = { ...DEFAULT_SCHEDULE }
          for (const day of DAYS) {
            if (hours[day.key]) {
              merged[day.key] = { ...hours[day.key], enabled: true }
            } else {
              merged[day.key] = { ...DEFAULT_SCHEDULE[day.key], enabled: false }
            }
          }
          setSchedule(merged)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const operating_hours: Record<string, { open: string; close: string }> = {}
    for (const day of DAYS) {
      if (schedule[day.key].enabled) {
        operating_hours[day.key] = { open: schedule[day.key].open, close: schedule[day.key].close }
      }
    }

    try {
      const res = await fetch('/api/tenant/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, operating_hours }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage(`❌ ${data.error}`); return }
      setMessage('✅ Horarios guardados')
      setTimeout(() => setMessage(''), 3000)
    } catch { setMessage('❌ Error al guardar') }
    finally { setSaving(false) }
  }

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(s => ({ ...s, [day]: { ...s[day], [field]: value } }))
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-xl border">
      {message && (
        <div className={`p-4 border-b rounded-t-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSave} className="p-6">
        <h2 className="font-semibold text-gray-900 mb-1">🕐 Horarios de Atención</h2>
        <p className="text-sm text-gray-500 mb-5">Define los días y horas en que tu restaurante está abierto.</p>

        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day.key} className={`flex items-center gap-4 p-3 rounded-lg border ${schedule[day.key].enabled ? 'bg-white' : 'bg-gray-50'}`}>
              <label className="flex items-center gap-2 w-28 cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={schedule[day.key].enabled}
                  onChange={e => updateDay(day.key, 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className={`text-sm font-medium ${schedule[day.key].enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                  {day.label}
                </span>
              </label>

              {schedule[day.key].enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={schedule[day.key].open}
                    onChange={e => updateDay(day.key, 'open', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="time"
                    value={schedule[day.key].close}
                    onChange={e => updateDay(day.key, 'close', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Cerrado</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-5 mt-5 border-t">
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm">
            {saving ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      </form>
    </div>
  )
}
