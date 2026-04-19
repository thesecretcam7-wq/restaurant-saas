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

interface DaySchedule {
  enabled: boolean
  turno_mañana?: { open: string; close: string; enabled: boolean }
  turno_tarde?: { open: string; close: string; enabled: boolean }
}

type Schedule = Record<string, DaySchedule>

const DEFAULT_SCHEDULE: Schedule = Object.fromEntries(
  DAYS.map(d => [d.key, {
    enabled: d.key !== 'sunday',
    turno_mañana: { open: '08:00', close: '14:00', enabled: d.key !== 'sunday' },
    turno_tarde: { open: '17:00', close: '22:00', enabled: false }
  }])
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

    const operating_hours: Record<string, any> = {}
    for (const day of DAYS) {
      if (schedule[day.key].enabled) {
        operating_hours[day.key] = {}
        const turno_mañana = schedule[day.key].turno_mañana
        const turno_tarde = schedule[day.key].turno_tarde
        if (turno_mañana?.enabled) {
          operating_hours[day.key].turno_mañana = {
            open: turno_mañana.open,
            close: turno_mañana.close
          }
        }
        if (turno_tarde?.enabled) {
          operating_hours[day.key].turno_tarde = {
            open: turno_tarde.open,
            close: turno_tarde.close
          }
        }
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

  const updateDay = (day: string, shift: 'turno_mañana' | 'turno_tarde' | 'enabled', field: string, value: string | boolean) => {
    setSchedule(s => {
      const updated = { ...s[day] }
      if (shift === 'enabled') {
        updated.enabled = value as boolean
      } else {
        if (!updated[shift]) {
          updated[shift] = { open: '08:00', close: '14:00', enabled: true }
        }
        updated[shift] = { ...updated[shift], [field]: value }
      }
      return { ...s, [day]: updated }
    })
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div className="bg-white rounded-xl border shadow-md">
      {message && (
        <div className={`p-4 border-b rounded-t-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSave} className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🕐 Horarios de Atención</h2>
          <p className="text-gray-600">Configura los turnos de tu restaurante. Puedes establecer un turno de mañana y otro de tarde.</p>
        </div>

        <div className="space-y-5">
          {DAYS.map(day => (
            <div
              key={day.key}
              className={`border rounded-xl p-5 transition-all ${
                schedule[day.key].enabled
                  ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {/* Encabezado del día */}
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule[day.key].enabled}
                    onChange={e => updateDay(day.key, 'enabled', '', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <span className={`font-semibold text-lg ${schedule[day.key].enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {day.label}
                  </span>
                </label>
                {!schedule[day.key].enabled && (
                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Cerrado</span>
                )}
              </div>

              {schedule[day.key].enabled && (
                <div className="space-y-4">
                  {/* Turno Mañana */}
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={schedule[day.key].turno_mañana?.enabled ?? false}
                        onChange={e => updateDay(day.key, 'turno_mañana', 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600"
                      />
                      <label className="font-medium text-gray-700">🌅 Turno Mañana</label>
                    </div>
                    {schedule[day.key].turno_mañana?.enabled && (
                      <div className="flex items-center gap-3 ml-7">
                        <input
                          type="time"
                          value={schedule[day.key].turno_mañana?.open || '08:00'}
                          onChange={e => updateDay(day.key, 'turno_mañana', 'open', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-400 font-medium">—</span>
                        <input
                          type="time"
                          value={schedule[day.key].turno_mañana?.close || '14:00'}
                          onChange={e => updateDay(day.key, 'turno_mañana', 'close', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Turno Tarde */}
                  <div className="bg-white rounded-lg p-4 border border-orange-100">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={schedule[day.key].turno_tarde?.enabled ?? false}
                        onChange={e => updateDay(day.key, 'turno_tarde', 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600"
                      />
                      <label className="font-medium text-gray-700">🌆 Turno Tarde</label>
                    </div>
                    {schedule[day.key].turno_tarde?.enabled && (
                      <div className="flex items-center gap-3 ml-7">
                        <input
                          type="time"
                          value={schedule[day.key].turno_tarde?.open || '17:00'}
                          onChange={e => updateDay(day.key, 'turno_tarde', 'open', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <span className="text-gray-400 font-medium">—</span>
                        <input
                          type="time"
                          value={schedule[day.key].turno_tarde?.close || '22:00'}
                          onChange={e => updateDay(day.key, 'turno_tarde', 'close', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg text-sm"
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar horarios'}
          </button>
        </div>
      </form>
    </div>
  )
}
