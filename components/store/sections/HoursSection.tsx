'use client'

import { useEffect, useState } from 'react'
import type { RestaurantSettings } from '@/lib/types'

interface Props {
  settings: RestaurantSettings
  primary: string
  title: string
  borderRadius: string
  cardClasses: string
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miercoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sabado',
  sunday: 'Domingo',
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function getDayRanges(dayHours: any) {
  if (!dayHours) return []
  if (dayHours.open && dayHours.close) return [{ open: dayHours.open, close: dayHours.close }]

  return ['turno_mañana', 'turno_maÃ±ana', 'turno_tarde']
    .map(key => dayHours[key])
    .filter((shift: any) => shift?.open && shift?.close)
    .map((shift: any) => ({ open: shift.open, close: shift.close }))
}

function getMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function isOvernightRange(range: { open: string; close: string }) {
  const openMinutes = getMinutes(range.open)
  const closeMinutes = getMinutes(range.close)
  return openMinutes !== null && closeMinutes !== null && closeMinutes <= openMinutes
}

function isNowInRange(range: { open: string; close: string }, currentMinutes: number) {
  const openMinutes = getMinutes(range.open)
  const closeMinutes = getMinutes(range.close)
  if (openMinutes === null || closeMinutes === null) return false

  if (closeMinutes <= openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

function isStoreOpen(hours: Record<string, any>, todayKey: string, currentMinutes: number) {
  const todayIndex = DAY_ORDER.indexOf(todayKey)
  const previousDayKey = DAY_ORDER[(todayIndex + DAY_ORDER.length - 1) % DAY_ORDER.length]
  const todayOpen = getDayRanges(hours[todayKey]).some(range => isNowInRange(range, currentMinutes))
  const previousOvernightOpen = getDayRanges(hours[previousDayKey])
    .filter(isOvernightRange)
    .some(range => isNowInRange(range, currentMinutes))

  return todayOpen || previousOvernightOpen
}

export default function HoursSection({ settings, primary, title, borderRadius, cardClasses }: Props) {
  const [now, setNow] = useState<Date | null>(null)
  const hours = settings?.operating_hours

  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!hours || Object.keys(hours).length === 0) return null

  const todayKey = now ? DAY_ORDER[now.getDay() === 0 ? 6 : now.getDay() - 1] : null

  return (
    <section className="px-4 pt-4 pb-2">
      <div className={`overflow-hidden ${cardClasses}`} style={{ borderRadius }}>
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <IsOpenBadge hours={hours} todayKey={todayKey} primary={primary} now={now} />
        </div>
        <div className="divide-y divide-gray-50">
          {DAY_ORDER.map(day => {
            const dayHours = hours[day]
            const ranges = getDayRanges(dayHours)
            const isToday = day === todayKey
            return (
              <div
                key={day}
                className={`flex items-center justify-between gap-4 px-4 py-2.5 ${isToday ? 'bg-gray-50' : ''}`}
              >
                <span className={`text-sm ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                  {DAY_LABELS[day]}
                  {isToday && <span className="ml-1.5 text-xs font-medium" style={{ color: primary }}>Hoy</span>}
                </span>
                <span className={`text-right text-sm font-medium ${ranges.length > 0 ? 'text-gray-800' : 'text-muted-foreground'}`}>
                  {ranges.length > 0 ? ranges.map(range => `${range.open} - ${range.close}`).join(' / ') : 'Cerrado'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function IsOpenBadge({ hours, todayKey, primary, now }: { hours: Record<string, any>; todayKey: string | null; primary: string; now: Date | null }) {
  if (!todayKey || !now) {
    return <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Calculando...</span>
  }

  const todayRanges = getDayRanges(hours[todayKey])
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const isOpen = isStoreOpen(hours, todayKey, currentMinutes)

  if (todayRanges.length === 0 && !isOpen) {
    return <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Cerrado hoy</span>
  }

  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: isOpen ? `${primary}15` : '#FEF2F2',
        color: isOpen ? primary : '#DC2626',
      }}
    >
      {isOpen ? 'Abierto ahora' : 'Cerrado'}
    </span>
  )
}
