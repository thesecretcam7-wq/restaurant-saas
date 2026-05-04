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
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function HoursSection({ settings, primary, title, borderRadius, cardClasses }: Props) {
  const hours = settings?.operating_hours
  if (!hours || Object.keys(hours).length === 0) return null

  const now = new Date()
  const todayKey = DAY_ORDER[now.getDay() === 0 ? 6 : now.getDay() - 1]

  return (
    <section className="px-4 pt-4 pb-2">
      <div className={`overflow-hidden ${cardClasses}`} style={{ borderRadius }}>
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <IsOpenBadge hours={hours} todayKey={todayKey} primary={primary} />
        </div>
        <div className="divide-y divide-gray-50">
          {DAY_ORDER.map(day => {
            const dayHours = hours[day]
            const isToday = day === todayKey
            return (
              <div
                key={day}
                className={`flex items-center justify-between px-4 py-2.5 ${isToday ? 'bg-gray-50' : ''}`}
              >
                <span className={`text-sm ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                  {DAY_LABELS[day]}
                  {isToday && <span className="ml-1.5 text-xs font-medium" style={{ color: primary }}>Hoy</span>}
                </span>
                <span className={`text-sm font-medium ${dayHours ? 'text-gray-800' : 'text-muted-foreground'}`}>
                  {dayHours ? `${dayHours.open} – ${dayHours.close}` : 'Cerrado'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function IsOpenBadge({ hours, todayKey, primary }: { hours: Record<string, any>; todayKey: string; primary: string }) {
  const todayHours = hours[todayKey]
  if (!todayHours) return <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Cerrado hoy</span>

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = todayHours.open.split(':').map(Number)
  const [closeH, closeM] = todayHours.close.split(':').map(Number)
  const openMinutes = openH * 60 + (openM || 0)
  const closeMinutes = closeH * 60 + (closeM || 0)

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes

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
