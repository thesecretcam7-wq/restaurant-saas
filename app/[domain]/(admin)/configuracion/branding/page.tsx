'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter (Moderno)' },
  { value: 'Poppins', label: 'Poppins (Amigable)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegante)' },
  { value: 'Roboto', label: 'Roboto (Profesional)' },
  { value: 'Georgia', label: 'Georgia (Clásico)' },
]

interface BrandingForm {
  app_name: string
  tagline: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  font_family: string
  logo_url: string
}

export default function BrandingPage() {
  const params = useParams()
  const tenantId = params.domain as string

  const [form, setForm] = useState<BrandingForm>({
    app_name: 'Pizzería Test',
    tagline: 'Los mejores pizzas de la ciudad',
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    accent_color: '#F59E0B',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    logo_url: '',
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (field: keyof BrandingForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          ...form,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Error al guardar los cambios'}`)
        return
      }

      setMessage('✅ ' + (data.message || 'Cambios guardados exitosamente'))
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personalización</h1>
          <p className="text-gray-600">Personaliza los colores, logo, tipografía y textos de tu restaurante</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Mensaje de estado */}
          {message && (
            <div className="p-4 border-b border-gray-200 bg-blue-50 text-blue-800 rounded-t-xl">
              {message}
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Sección: Información Básica */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📝 Información Básica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de tu Restaurante
                  </label>
                  <input
                    type="text"
                    value={form.app_name}
                    onChange={(e) => handleChange('app_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Mi Pizzería"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lema / Tagline
                  </label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Las mejores pizzas de la ciudad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL del Logo (imagen)
                  </label>
                  <input
                    type="url"
                    value={form.logo_url}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://ejemplo.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">Pronto: subida de archivos 📤</p>
                </div>
              </div>
            </div>

            {/* Sección: Colores */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🎨 Colores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Primario (botones, enlaces)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={form.primary_color}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Secundario (títulos, textos)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={form.secondary_color}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Acento (destacados, ofertas)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={form.accent_color}
                      onChange={(e) => handleChange('accent_color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color de Fondo
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      value={form.background_color}
                      onChange={(e) => handleChange('background_color', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección: Tipografía */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                ✍️ Tipografía
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Familia de Fuentes
                </label>
                <select
                  value={form.font_family}
                  onChange={(e) => handleChange('font_family', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {FONT_FAMILIES.map(font => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-2">
                  Previsualización:{' '}
                  <span style={{ fontFamily: form.font_family }}>
                    Este es el texto con la tipografía seleccionada
                  </span>
                </p>
              </div>
            </div>

            {/* Vista Previa */}
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">📱 Vista Previa</h3>
              <div
                className="rounded-lg overflow-hidden shadow-lg"
                style={{ backgroundColor: form.background_color, fontFamily: form.font_family }}
              >
                <div
                  className="p-6 text-white"
                  style={{ backgroundColor: form.primary_color }}
                >
                  <h1 className="text-3xl font-bold mb-2">{form.app_name}</h1>
                  <p className="text-sm opacity-90">{form.tagline}</p>
                </div>

                <div className="p-6 space-y-4" style={{ color: form.secondary_color }}>
                  <div>
                    <h2
                      className="text-xl font-semibold mb-2"
                      style={{ color: form.secondary_color }}
                    >
                      Ejemplo de Categoría
                    </h2>
                    <div className="space-y-2">
                      <div
                        className="p-3 border rounded-lg flex justify-between items-center"
                        style={{
                          borderColor: form.primary_color,
                          backgroundColor: form.background_color,
                        }}
                      >
                        <div>
                          <p className="font-semibold" style={{ color: form.secondary_color }}>
                            Pizza Margherita
                          </p>
                          <p className="text-sm text-gray-500">Queso, tomate y albahaca</p>
                        </div>
                        <button
                          className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
                          style={{ backgroundColor: form.accent_color }}
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
