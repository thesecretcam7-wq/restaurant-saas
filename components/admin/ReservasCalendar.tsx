'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Users, Clock, Phone, Check, X, AlertCircle } from 'lucide-react'

interface Reservation {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'no-show' | 'completed'
  notes?: string
}

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',  bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  confirmed: { label: 'Confirmada', bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled: { label: 'Cancelada',  bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-500' },
  'no-show': { label: 'No asistió', bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  completed: { label: 'Completada', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ReservasCalendar({ tenantId }: { tenantId: string }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0])
  const [monthReservations, setMonthReservations] = useState<Reservation[]>([])
  const [dayReservations, setDayReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const fetchMonth = useCallback(async () => {
    setLoading(true)
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      const res = await fetch(`/api/reservations/range?domain=${tenantId}&start=${startDate}&end=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setMonthReservations(data.reservations || [])
      }
    } finally {
      setLoading(false)
    }
  }, [year, month, tenantId])

  useEffect(() => { fetchMonth() }, [fetchMonth])

  useEffect(() => {
    const day = monthReservations.filter(r => r.reservation_date === selectedDate)
      .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
    setDayReservations(day)
  }, [selectedDate, monthReservations])

  const reservationsByDate = monthReservations.reduce<Record<string, Reservation[]>>((acc, r) => {
    if (!acc[r.reservation_date]) acc[r.reservation_date] = []
    acc[r.reservation_date].push(r)
    return acc
  }, {})

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }

  function selectDay(day: number) {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(d)
  }

  async function updateStatus(reservationId: string, action: 'confirm' | 'cancel') {
    setActionLoading(reservationId)
    try {
      await fetch(`/api/reservations/${reservationId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      await fetchMonth()
    } finally {
      setActionLoading(null)
    }
  }

  const todayStr = today.toISOString().split('T')[0]

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* ── Calendar ── */}
      <div className="lg:w-[420px] flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="font-semibold text-gray-900 text-base">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="h-16 border-b border-r border-gray-50 last:border-r-0" />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayRes = reservationsByDate[dateStr] || []
              const pending = dayRes.filter(r => r.status === 'pending').length
              const confirmed = dayRes.filter(r => r.status === 'confirmed').length
              const colIdx = i % 7
              const isLastCol = colIdx === 6

              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  className={`h-16 p-1.5 text-left flex flex-col border-b border-r transition-colors
                    ${isLastCol ? 'border-r-0' : ''}
                    ${isSelected ? 'bg-blue-50 border-blue-200' : isToday ? 'bg-amber-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-amber-500 text-white' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {pending > 0 && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium leading-none">
                        <AlertCircle className="w-2.5 h-2.5" />{pending}
                      </span>
                    )}
                    {confirmed > 0 && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium leading-none">
                        <Check className="w-2.5 h-2.5" />{confirmed}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-yellow-500" />Pendiente</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" />Confirmada</span>
          </div>
        </div>

        {/* Month summary */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['pending','confirmed','completed'] as const).map(s => {
            const cfg = STATUS_CONFIG[s]
            const count = monthReservations.filter(r => r.status === s).length
            return (
              <div key={s} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <p className={`text-xl font-bold ${cfg.text}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{cfg.label}s</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Day detail ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {dayReservations.length === 0 ? 'Sin reservas' : `${dayReservations.length} reserva${dayReservations.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : dayReservations.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500 font-medium">No hay reservas para este día</p>
              <p className="text-sm text-gray-400 mt-1">Selecciona otro día en el calendario</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {dayReservations.map(r => {
                const s = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending
                const isLoading = actionLoading === r.id
                return (
                  <div key={r.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="bg-gray-100 rounded-xl px-3 py-2 text-center flex-shrink-0">
                          <p className="text-lg font-bold text-gray-900 leading-none">{r.reservation_time.slice(0, 5)}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{r.customer_name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
                              {s.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />{r.party_size} personas
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />{r.customer_phone}
                            </span>
                          </div>
                          {r.notes && (
                            <p className="mt-1.5 text-xs text-gray-400 italic bg-gray-50 rounded-lg px-2 py-1">
                              "{r.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {r.status !== 'completed' && r.status !== 'cancelled' && (
                        <div className="flex gap-2 flex-shrink-0">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(r.id, 'confirm')}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />Confirmar
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(r.id, 'cancel')}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
