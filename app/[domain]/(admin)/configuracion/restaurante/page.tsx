'use client'

import { useState } from 'react'

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

export default function RestaurantConfigPage() {
  const [form, setForm] = useState<RestaurantForm>({
    display_name: 'Pizzería Test',
    description: 'La mejor pizzería de la ciudad',
    address: 'Calle Principal 123',
    phone: '+34 123 456 789',
    email: 'info@pizzeria-test.com',
    city: 'Madrid',
    timezone: 'Europe/Madrid',
    delivery_enabled: false,
    reservations_enabled: false,
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (field: keyof RestaurantForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      // Aquí irá la llamada a API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage('✅ Información del restaurante actualizada')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const TIMEZONES = [
    { value: 'Europe/Madrid', label: 'Madrid (Europa/Madrid)' },
    { value: 'America/New_York', label: 'Nueva York (América/Nueva York)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (América/Los Ángeles)' },
    { value: 'America/Mexico_City', label: 'México (América/Ciudad de México)' },
    { value: 'America/Bogota', label: 'Colombia (América/Bogotá)' },
    { value: 'America/Buenos_Aires', label: 'Argentina (América/Buenos Aires)' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Mensaje de estado */}
      {message && (
        <div className="p-4 border-b border-gray-200 bg-blue-50 text-blue-800 rounded-t-xl">
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
                Nombre del Restaurante
              </label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📞 Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📍 Ubicación</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zona Horaria
                </label>
                <select
                  value={form.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
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

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
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
