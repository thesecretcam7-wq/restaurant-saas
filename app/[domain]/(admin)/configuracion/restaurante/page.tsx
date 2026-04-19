'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface RestaurantForm {
  display_name: string
  description: string
  address: string
  phone: string
  email: string
  city: string
  timezone: string
  delivery_enabled: boolean
  reservations_enabled: boolean
}

const DEFAULTS: RestaurantForm = {
  display_name: '',
  description: '',
  address: '',
  phone: '',
  email: '',
  city: '',
  timezone: 'America/Bogota',
  delivery_enabled: false,
  reservations_enabled: false,
}

const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'Madrid (Europa/Madrid)' },
  { value: 'America/New_York', label: 'Nueva York (América/Nueva York)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (América/Los Ángeles)' },
  { value: 'America/Mexico_City', label: 'México (América/Ciudad de México)' },
  { value: 'America/Bogota', label: 'Colombia (América/Bogotá)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (América/Buenos Aires)' },
]

export default function RestaurantConfigPage() {
  const params = useParams()
  const tenantSlug = params.domain as string

  const [form, setForm] = useState<RestaurantForm>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tenantSlug) return
    fetch(`/api/tenant/restaurant?tenantSlug=${tenantSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setForm({
            display_name: data.data.display_name || '',
            description: data.data.description || '',
            address: data.data.address || '',
            phone: data.data.phone || '',
            email: data.data.email || '',
            city: data.data.city || '',
            timezone: data.data.timezone || DEFAULTS.timezone,
            delivery_enabled: data.data.delivery_enabled || false,
            reservations_enabled: data.data.reservations_enabled || false,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantSlug])

  const handleChange = (field: keyof RestaurantForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/tenant/restaurant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug, ...form }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Error al guardar los cambios'}`)
        return
      }
      setMessage('✅ ' + (data.message || 'Información actualizada exitosamente'))
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('❌ Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {message && (
        <div className={`p-4 border-b border-gray-200 rounded-t-xl ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {/* Información Básica */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Información Básica</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Restaurante *
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Describe tu restaurante..."
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📞 Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📍 Ubicación</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
                <select
                  value={form.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Servicios */}
        <div className="pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 Servicios</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.delivery_enabled}
                onChange={(e) => handleChange('delivery_enabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">
                <strong>Delivery a domicilio</strong>
                <p className="text-sm text-gray-500">Permitir que los clientes pidan entregas a domicilio</p>
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reservations_enabled}
                onChange={(e) => handleChange('reservations_enabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">
                <strong>Sistema de reservas</strong>
                <p className="text-sm text-gray-500">Permitir que los clientes hagan reservas de mesa</p>
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
