'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Reservation {
  id: string
  customer_name: string
  customer_email: string | null
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  status: string
  notes: string | null
  tables: { name: string; capacity: number }
  created_at: string
}

export default function ReservasPage() {
  const params = useParams()
  const domain = params.domain as string

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const res = await fetch(`/api/reservations?domain=${domain}&date=${selectedDate}&status=${filter === 'all' ? '' : filter}`)
        if (!res.ok) throw new Error('Error fetching reservations')
        const data = await res.json()
        setReservations(data.reservations || [])
      } catch (err) {
        console.error('Error fetching reservations:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchReservations()
  }, [domain, selectedDate, filter])

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendiente' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmada' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelada' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Completada' },
    }
    const c = config[status] || config.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reservas</h1>
        <p className="text-slate-600 mt-1">Gestiona las reservaciones de tu restaurante</p>
      </div>

      {/* Date Selector */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-semibold text-slate-900">Fecha:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {status === 'all' && 'Todas'}
            {status === 'pending' && 'Pendientes'}
            {status === 'confirmed' && 'Confirmadas'}
            {status === 'cancelled' && 'Canceladas'}
          </button>
        ))}
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando reservas...</p>
            </div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600 text-lg font-medium">No hay reservas</p>
              <p className="text-slate-500 text-sm">Las reservaciones aparecerán aquí cuando los clientes las realicen</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Hora</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Cliente</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Personas</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Mesa</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Teléfono</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reservations.map(reservation => (
                  <tr key={reservation.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{reservation.reservation_time}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{reservation.customer_name}</p>
                        {reservation.customer_email && (
                          <p className="text-xs text-slate-500">{reservation.customer_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{reservation.party_size}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {reservation.tables?.name} ({reservation.tables?.capacity} capacity)
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{reservation.customer_phone}</td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(reservation.status)}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {reservation.status === 'pending' && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/reservations/${reservation.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'confirmed' }),
                            })
                            setReservations(r => r.map(res => res.id === reservation.id ? { ...res, status: 'confirmed' } : res))
                          }}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Confirmar
                        </button>
                      )}
                      {reservation.status !== 'cancelled' && (
                        <button
                          onClick={async () => {
                            if (confirm('¿Cancelar esta reserva?')) {
                              await fetch(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
                              setReservations(r => r.map(res => res.id === reservation.id ? { ...res, status: 'cancelled' } : res))
                            }
                          }}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Estados de Reserva</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• <strong>Pendiente</strong>: Reserva sin confirmar, espera tu aprobación</li>
          <li>• <strong>Confirmada</strong>: Reserva aprobada, cliente notificado</li>
          <li>• <strong>Completada</strong>: Reserva realizada</li>
          <li>• <strong>Cancelada</strong>: Reserva cancelada</li>
        </ul>
      </div>
    </div>
  )
}
