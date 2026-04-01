import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ date?: string; status?: string }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-100 text-red-700' },
  'no-show': { label: 'No asistió', color: 'bg-gray-100 text-gray-600' },
  completed: { label: 'Completada', color: 'bg-blue-100 text-blue-700' },
}

export default async function ReservasAdminPage({ params, searchParams }: Props) {
  const { domain: tenantId } = await params
  const { date, status } = await searchParams
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const filterDate = date || today

  let query = supabase
    .from('reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('reservation_date', filterDate)
    .order('reservation_time')

  if (status) query = query.eq('status', status)

  const { data: reservations } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-1">{reservations?.length || 0} reservas para {filterDate}</p>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          defaultValue={filterDate}
          className="px-3 py-2 border rounded-lg text-sm"
          onChange={e => {
            const url = new URL(window.location.href)
            url.searchParams.set('date', e.target.value)
            window.location.href = url.toString()
          }}
        />
        <div className="flex gap-2">
          {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => (
            <a key={key} href={`?date=${filterDate}&status=${key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${(status || '') === key ? 'ring-2 ring-blue-500' : ''} ${color}`}>
              {label}
            </a>
          ))}
          <a href={`?date=${filterDate}`} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${!status ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'}`}>
            Todas
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        {!reservations?.length ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p>No hay reservas para esta fecha</p>
          </div>
        ) : (
          <div className="divide-y">
            {reservations.map(r => {
              const s = STATUS_LABELS[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <div key={r.id} className="flex items-center gap-4 p-4">
                  <div className="w-16 text-center">
                    <p className="font-bold text-lg">{r.reservation_time.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{r.customer_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                    </div>
                    <p className="text-sm text-gray-500">{r.party_size} personas • {r.customer_phone}</p>
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{r.notes}</p>}
                  </div>
                  <ReservationActions reservationId={r.id} status={r.status} tenantId={tenantId} date={filterDate} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ReservationActions({ reservationId, status, tenantId, date }: { reservationId: string; status: string; tenantId: string; date: string }) {
  if (status === 'completed' || status === 'cancelled') return null
  return (
    <div className="flex gap-2">
      {status === 'pending' && (
        <form action={`/api/reservations/${reservationId}/confirm`} method="POST">
          <input type="hidden" name="tenantId" value={tenantId} />
          <button type="submit" className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">
            Confirmar
          </button>
        </form>
      )}
      <form action={`/api/reservations/${reservationId}/cancel`} method="POST">
        <input type="hidden" name="tenantId" value={tenantId} />
        <button type="submit" className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">
          Cancelar
        </button>
      </form>
    </div>
  )
}
