'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const GOOGLE_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 'Nunito', 'Raleway', 'Poppins', 'Oswald']

interface BrandingProps { params: Promise<{ domain: string }> }

async function getTenantIdFromSlugClient(slug: string) {
  const supabase = createClient()
  const { data } = await supabase.from('tenants').select('id').eq('slug', slug).single()
  return data?.id || null
}

export default function BrandingPage({ params }: BrandingProps) {
  const { domain: slug } = use(params)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState({
    app_name: '',
    tagline: '',
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    accent_color: '#F59E0B',
    background_color: '#FFFFFF',
    font_family: 'Inter',
    logo_url: '',
  })

  useEffect(() => {
    const initializeTenantId = async () => {
      const resolvedTenantId = await getTenantIdFromSlugClient(slug)
      setTenantId(resolvedTenantId)
    }
    initializeTenantId()
  }, [slug])

  useEffect(() => {
    if (!tenantId) return
    const supabase = createClient()
    Promise.all([
      supabase.from('tenant_branding').select('*').eq('tenant_id', tenantId).single(),
      supabase.from('tenants').select('logo_url').eq('id', tenantId).single(),
    ]).then(([{ data: branding }, { data: tenant }]) => {
      if (branding) {
        setForm(f => ({
          ...f,
          app_name: branding.app_name || '',
          tagline: branding.tagline || '',
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          background_color: branding.background_color,
          font_family: branding.font_family,
        }))
      }
      if (tenant?.logo_url) setForm(f => ({ ...f, logo_url: tenant.logo_url }))
      setLoading(false)
    }).catch(() => {
      // Tabla no existe aún, valores por defecto están bien
      setLoading(false)
    })
  }, [tenantId])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'logos')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) {
      setForm(f => ({ ...f, logo_url: data.url }))
    }
    setUploadingLogo(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    try {
      const [r1, r2] = await Promise.all([
        supabase.from('tenant_branding').upsert({
          tenant_id: tenantId,
          app_name: form.app_name,
          tagline: form.tagline,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color,
          background_color: form.background_color,
          font_family: form.font_family,
          font_url: `https://fonts.googleapis.com/css2?family=${form.font_family.replace(' ', '+')}:wght@400;600;700&display=swap`,
        }, { onConflict: 'tenant_id' }),
        supabase.from('tenants').update({ logo_url: form.logo_url || null }).eq('id', tenantId),
      ])
      setSaving(false)
      if (!r1.error && !r2.error) toast.success('Cambios guardados')
      else toast.error('Error al guardar: ' + (r1.error?.message || r2.error?.message))
    } catch (err) {
      setSaving(false)
      toast.error('Error al guardar')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
        <p className="text-gray-500 text-sm mt-1">Personaliza la apariencia de tu restaurante</p>
      </div>

      <div className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Logo</h2>
          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-20 h-20 rounded-xl object-cover border" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-3xl border">🍽️</div>
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload" className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 block">
                {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
              </label>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG — máx 2MB</p>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Identidad</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre visible</label>
            <input
              value={form.app_name}
              onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mi Restaurante"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
            <input
              value={form.tagline}
              onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="El mejor sabor de la ciudad"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Colores</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'primary_color', label: 'Color primario' },
              { key: 'secondary_color', label: 'Color secundario' },
              { key: 'accent_color', label: 'Color acento' },
              { key: 'background_color', label: 'Color fondo' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-10 h-10 rounded-lg border cursor-pointer p-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{(form as any)[key]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Tipografía</h2>
          <div className="grid grid-cols-2 gap-3">
            {GOOGLE_FONTS.map(font => (
              <button
                key={font}
                onClick={() => setForm(f => ({ ...f, font_family: font }))}
                className={`px-4 py-3 rounded-lg border text-left transition-colors ${form.font_family === font ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                style={{ fontFamily: font }}
              >
                <p className="text-sm font-medium">{font}</p>
                <p className="text-xs text-gray-400">Abc 123</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl border p-6 overflow-hidden"
          style={{
            backgroundColor: form.background_color,
            fontFamily: form.font_family,
          }}
        >
          <p className="text-xs text-gray-400 mb-3">Vista previa</p>
          <h3 className="text-xl font-bold mb-1" style={{ color: form.primary_color }}>
            {form.app_name || 'Tu Restaurante'}
          </h3>
          <p className="text-sm mb-4" style={{ color: form.secondary_color }}>
            {form.tagline || 'El mejor sabor de la ciudad'}
          </p>
          <button className="px-5 py-2 rounded-lg text-sm text-white font-medium" style={{ backgroundColor: form.primary_color }}>
            Ver Menú
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
