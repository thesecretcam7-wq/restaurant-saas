'use client'

import { useState, useEffect, useRef } from 'react'
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

const DEFAULTS: BrandingForm = {
  app_name: '',
  tagline: '',
  primary_color: '#3B82F6',
  secondary_color: '#1F2937',
  accent_color: '#F59E0B',
  background_color: '#FFFFFF',
  font_family: 'Inter',
  logo_url: '',
}

export default function BrandingPage() {
  const params = useParams()
  const tenantId = params.domain as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<BrandingForm>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!tenantId) return
    fetch(`/api/tenant/branding?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setForm({
            app_name: data.data.app_name || '',
            tagline: data.data.tagline || '',
            primary_color: data.data.primary_color || DEFAULTS.primary_color,
            secondary_color: data.data.secondary_color || DEFAULTS.secondary_color,
            accent_color: data.data.accent_color || DEFAULTS.accent_color,
            background_color: data.data.background_color || DEFAULTS.background_color,
            font_family: data.data.font_family || DEFAULTS.font_family,
            logo_url: data.data.logo_url || '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleChange = (field: keyof BrandingForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    formData.append('path', `logos/${tenantId}/logo.${file.name.split('.').pop()}`)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) handleChange('logo_url', data.url)
      else setMessage('❌ Error al subir el logo')
    } catch {
      setMessage('❌ Error al subir el logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...form }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Error al guardar los cambios'}`)
        return
      }
      setMessage('✅ ' + (data.message || 'Cambios guardados exitosamente'))
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personalización</h1>
          <p className="text-gray-600">Personaliza los colores, logo, tipografía y textos de tu restaurante</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200">
          {message && (
            <div className={`p-4 border-b border-gray-200 rounded-t-xl ${message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Logo */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🖼️ Logo del Restaurante
              </h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🍽️</span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="block px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 text-center font-medium"
                  >
                    {uploadingLogo ? '⏳ Subiendo...' : '📤 Subir Logo'}
                  </label>
                  {form.logo_url && (
                    <button
                      type="button"
                      onClick={() => handleChange('logo_url', '')}
                      className="block text-xs text-red-500 hover:text-red-700 w-full text-center"
                    >
                      Eliminar logo
                    </button>
                  )}
                  <p className="text-xs text-gray-500">PNG, JPG, WebP. Máx 2MB</p>
                </div>
              </div>
            </div>

            {/* Información Básica */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📝 Información Básica
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de tu Restaurante *
                  </label>
                  <input
                    type="text"
                    value={form.app_name}
                    onChange={(e) => handleChange('app_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Mi Pizzería"
                    required
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
              </div>
            </div>

            {/* Colores */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🎨 Colores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'primary_color', label: 'Color Primario (botones, enlaces)' },
                  { key: 'secondary_color', label: 'Color Secundario (títulos, textos)' },
                  { key: 'accent_color', label: 'Color Acento (destacados, ofertas)' },
                  { key: 'background_color', label: 'Color de Fondo' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form[key as keyof BrandingForm]}
                        onChange={(e) => handleChange(key as keyof BrandingForm, e.target.value)}
                        className="h-12 w-20 rounded-lg cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={form[key as keyof BrandingForm]}
                        onChange={(e) => handleChange(key as keyof BrandingForm, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipografía */}
            <div className="border-b pb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                ✍️ Tipografía
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Familia de Fuentes</label>
                <select
                  value={form.font_family}
                  onChange={(e) => handleChange('font_family', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {FONT_FAMILIES.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
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
                <div className="p-6 text-white" style={{ backgroundColor: form.primary_color }}>
                  <div className="flex items-center gap-3 mb-2">
                    {form.logo_url && (
                      <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover bg-white/20" />
                    )}
                    <h1 className="text-2xl font-bold">{form.app_name || 'Mi Restaurante'}</h1>
                  </div>
                  {form.tagline && <p className="text-sm opacity-90">{form.tagline}</p>}
                </div>
                <div className="p-6 space-y-4" style={{ color: form.secondary_color }}>
                  <div>
                    <h2 className="text-xl font-semibold mb-2" style={{ color: form.secondary_color }}>
                      Ejemplo de Categoría
                    </h2>
                    <div
                      className="p-3 border rounded-lg flex justify-between items-center"
                      style={{ borderColor: form.primary_color, backgroundColor: form.background_color }}
                    >
                      <div>
                        <p className="font-semibold" style={{ color: form.secondary_color }}>Pizza Margherita</p>
                        <p className="text-sm text-gray-500">Queso, tomate y albahaca</p>
                      </div>
                      <button
                        type="button"
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

          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploadingLogo}
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
