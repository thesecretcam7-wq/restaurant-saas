'use client'

import { useEffect, useState, use } from 'react'
import { CalendarDays, Check, Clock3, Copy, Save } from 'lucide-react'

interface Props { params: Promise<{ domain: string }> }

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miercoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sabado' },
  { key: 'sunday', label: 'Domingo' },
] as const

type DayKey = typeof DAYS[number]['key']
type ShiftKey = 'turno_mañana' | 'turno_tarde'

interface ShiftSchedule {
  open: string
  close: string
  enabled: boolean
}

interface DaySchedule {
  enabled: boolean
  turno_mañana: ShiftSchedule
  turno_tarde: ShiftSchedule
}

type Schedule = Record<DayKey, DaySchedule>

function createDefaultSchedule(): Schedule {
  return Object.fromEntries(
    DAYS.map(day => [
      day.key,
      {
        enabled: day.key !== 'sunday',
        turno_mañana: { open: '08:00', close: '14:00', enabled: day.key !== 'sunday' },
        turno_tarde: { open: '17:00', close: '22:00', enabled: false },
      },
    ])
  ) as Schedule
}

function normalizeDay(day: any, fallback: DaySchedule): DaySchedule {
  if (!day) return { ...fallback, enabled: false }

  if ('open' in day && 'close' in day) {
    return {
      enabled: true,
      turno_mañana: { open: day.open || fallback.turno_mañana.open, close: day.close || fallback.turno_mañana.close, enabled: true },
      turno_tarde: { ...fallback.turno_tarde, enabled: false },
    }
  }

  return {
    enabled: true,
    turno_mañana: {
      open: day.turno_mañana?.open || fallback.turno_mañana.open,
      close: day.turno_mañana?.close || fallback.turno_mañana.close,
      enabled: day.turno_mañana?.enabled ?? Boolean(day.turno_mañana),
    },
    turno_tarde: {
      open: day.turno_tarde?.open || fallback.turno_tarde.open,
      close: day.turno_tarde?.close || fallback.turno_tarde.close,
      enabled: day.turno_tarde?.enabled ?? Boolean(day.turno_tarde),
    },
  }
}

function cloneDay(day: DaySchedule): DaySchedule {
  return {
    enabled: day.enabled,
    turno_mañana: { ...day.turno_mañana },
    turno_tarde: { ...day.turno_tarde },
  }
}

export default function HorariosPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const [schedule, setSchedule] = useState<Schedule>(() => createDefaultSchedule())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadHours() {
      setLoading(true)
      try {
        const response = await fetch(`/api/tenant/horarios?tenantId=${tenantId}`, {
          credentials: 'include',
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los horarios')

        const defaults = createDefaultSchedule()
        const hours = data.data?.operating_hours || {}
        const next = { ...defaults }
        for (const day of DAYS) {
          next[day.key] = normalizeDay(hours[day.key], defaults[day.key])
        }
        if (!cancelled) setSchedule(next)
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error al cargar horarios')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHours()
    return () => { cancelled = true }
  }, [tenantId])

  function copyMondayTo(dayKeys: DayKey[]) {
    setSchedule(current => {
      const monday = cloneDay(current.monday)
      const next = { ...current }
      for (const dayKey of dayKeys) {
        if (dayKey !== 'monday') next[dayKey] = cloneDay(monday)
      }
      return next
    })
    setMessage('Horario del lunes copiado')
    setTimeout(() => setMessage(''), 2200)
  }

  function updateDay(day: DayKey, value: boolean) {
    setSchedule(current => ({
      ...current,
      [day]: { ...current[day], enabled: value },
    }))
  }

  function updateShift(day: DayKey, shift: ShiftKey, field: keyof ShiftSchedule, value: string | boolean) {
    setSchedule(current => ({
      ...current,
      [day]: {
        ...current[day],
        [shift]: {
          ...current[day][shift],
          [field]: value,
        },
      },
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const operating_hours: Record<string, any> = {}
    for (const day of DAYS) {
      const daySchedule = schedule[day.key]
      if (!daySchedule.enabled) continue

      const savedDay: Record<string, { open: string; close: string }> = {}
      if (daySchedule.turno_mañana.enabled) {
        savedDay.turno_mañana = {
          open: daySchedule.turno_mañana.open,
          close: daySchedule.turno_mañana.close,
        }
      }
      if (daySchedule.turno_tarde.enabled) {
        savedDay.turno_tarde = {
          open: daySchedule.turno_tarde.open,
          close: daySchedule.turno_tarde.close,
        }
      }
      if (Object.keys(savedDay).length > 0) operating_hours[day.key] = savedDay
    }

    try {
      const response = await fetch('/api/tenant/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, operating_hours }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los horarios')
      setMessage('Horarios guardados')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? `Error: ${error.message}` : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-md">
      {message && (
        <div className={`border-b px-5 py-3 text-sm font-bold ${message.startsWith('Error') ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">Configuracion</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-gray-950">
              <Clock3 className="h-6 w-6 text-blue-600" />
              Horarios de atencion
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-600">
              Configura el lunes y copia ese mismo horario a los demas dias cuando tu restaurante trabaja igual casi toda la semana.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            <button type="button" onClick={() => copyMondayTo(['tuesday', 'wednesday', 'thursday', 'friday'])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
              <Copy className="h-4 w-4" />
              Lunes a vie.
            </button>
            <button type="button" onClick={() => copyMondayTo(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
              <CalendarDays className="h-4 w-4" />
              Lunes a sab.
            </button>
            <button type="button" onClick={() => copyMondayTo(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100">
              <Check className="h-4 w-4" />
              Toda semana
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {DAYS.map(day => {
            const daySchedule = schedule[day.key]
            return (
              <section key={day.key} className={`rounded-xl border p-4 transition ${daySchedule.enabled ? 'border-blue-200 bg-blue-50/45' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={daySchedule.enabled}
                      onChange={event => updateDay(day.key, event.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600"
                    />
                    <span className={`text-lg font-black ${daySchedule.enabled ? 'text-gray-950' : 'text-gray-400'}`}>{day.label}</span>
                  </label>
                  {!daySchedule.enabled && <span className="w-fit rounded-full bg-gray-200 px-3 py-1 text-xs font-black text-gray-500">Cerrado</span>}
                </div>

                {daySchedule.enabled && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <ShiftEditor
                      title="Turno manana"
                      color="blue"
                      shift={daySchedule.turno_mañana}
                      onEnabledChange={value => updateShift(day.key, 'turno_mañana', 'enabled', value)}
                      onOpenChange={value => updateShift(day.key, 'turno_mañana', 'open', value)}
                      onCloseChange={value => updateShift(day.key, 'turno_mañana', 'close', value)}
                    />
                    <ShiftEditor
                      title="Turno tarde"
                      color="orange"
                      shift={daySchedule.turno_tarde}
                      onEnabledChange={value => updateShift(day.key, 'turno_tarde', 'enabled', value)}
                      onOpenChange={value => updateShift(day.key, 'turno_tarde', 'open', value)}
                      onCloseChange={value => updateShift(day.key, 'turno_tarde', 'close', value)}
                    />
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="mt-6 flex justify-end border-t pt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar horarios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ShiftEditor({
  title,
  color,
  shift,
  onEnabledChange,
  onOpenChange,
  onCloseChange,
}: {
  title: string
  color: 'blue' | 'orange'
  shift: ShiftSchedule
  onEnabledChange: (value: boolean) => void
  onOpenChange: (value: string) => void
  onCloseChange: (value: string) => void
}) {
  const activeClasses = color === 'blue' ? 'border-blue-100' : 'border-orange-100'
  const checkboxClass = color === 'blue' ? 'text-blue-600' : 'text-orange-600'
  const focusClass = color === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-orange-500'

  return (
    <div className={`rounded-lg border bg-white p-4 ${activeClasses}`}>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={shift.enabled}
          onChange={event => onEnabledChange(event.target.checked)}
          className={`h-4 w-4 rounded border-gray-300 ${checkboxClass}`}
        />
        <span className="font-black text-gray-800">{title}</span>
      </label>

      {shift.enabled && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <input
            type="time"
            value={shift.open}
            onChange={event => onOpenChange(event.target.value)}
            className={`min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 ${focusClass}`}
          />
          <span className="font-black text-gray-400">a</span>
          <input
            type="time"
            value={shift.close}
            onChange={event => onCloseChange(event.target.value)}
            className={`min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 ${focusClass}`}
          />
        </div>
      )}
    </div>
  )
}
