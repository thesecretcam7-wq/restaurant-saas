'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ReservasPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as string

  const [settings, setSettings] = useState<any>(null)
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partySize: '2',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationTime: '19:00',
    notes: '',
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/tenant/reservas?tenantId=${domain}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Error loading settings')
        const data = await res.json()
        setSettings(data.data)
        setTenantId(data.tenantId || '')
      } catch (err) {
        setError('Error al cargar la configuración')
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchSettings()
  }, [domain])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          domain,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          partySize: parseInt(formData.partySize),
          reservationDate: formData.reservationDate,
          reservationTime: formData.reservationTime,
          notes: formData.notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear reserva')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/${domain}`)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!settings?.reservations_enabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-md">
          <p className="text-slate-600 mb-4">Este restaurante no tiene reservas habilitadas</p>
          <a href={`/${domain}`} className="text-blue-600 hover:text-blue-700 font-medium">
            ← Volver
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Reserva Tu Mesa</h1>
          <p className="text-slate-600">Completa el formulario para hacer tu reservación</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ Reserva creada exitosamente!</p>
            <p className="text-green-700 text-sm">Serás redirigido en breve...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">✕ {error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Tu nombre completo"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Email</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
              placeholder="tu@email.com"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Teléfono *</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="+57 300 000 0000"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Date & Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Fecha *</label>
              <input
                type="date"
                value={formData.reservationDate}
                onChange={e => setFormData({ ...formData, reservationDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Hora *</label>
              <input
                type="time"
                value={formData.reservationTime}
                onChange={e => setFormData({ ...formData, reservationTime: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Número de Personas *</label>
            <select
              value={formData.partySize}
              onChange={e => setFormData({ ...formData, partySize: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'persona' : 'personas'}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Notas Especiales</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Cumpleaños, alergia, preferencias..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creando reserva...' : 'Reservar Mesa'}
            </button>
            <a
              href={`/${domain}`}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors text-center"
            >
              Cancelar
            </a>
          </div>
        </form>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Información Importante</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Te confirmaremos tu reserva por teléfono o email</li>
            <li>• Por favor llega 10 minutos antes de tu hora</li>
            <li>• Para cancelar, llama directamente al restaurante</li>
            <li>• Las mesas se reservan por máximo 2 horas</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
