'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import toast from 'react-hot-toast'

const GOOGLE_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 'Nunito', 'Raleway', 'Poppins', 'Oswald']

interface BrandingProps { params: Promise<{ domain: string }> }

export default function BrandingPage({ params }: BrandingProps) {
  const { domain: tenantSlug } = use(params)
  const { tenantId: tenantUUID, loading: resolvingTenant } = useTenantResolver(tenantSlug)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [form, setForm] = useState({
    // Identity
    app_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    hero_image_url: '',
    favicon_url: '',
    // Colors
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    accent_color: '#F59E0B',
    background_color: '#FFFFFF',
    button_primary_color: '#3B82F6',
    button_secondary_color: '#E5E7EB',
    text_primary_color: '#1F2937',
    text_secondary_color: '#6B7280',
    border_color: '#E5E7EB',
    // Typography
    font_family: 'Inter',
    heading_font: 'Inter',
    heading_font_size: 28,
    body_font_size: 16,
    // Styling
    border_radius: 8,
    button_border_radius: 6,
    shadow_intensity: 'medium',
    button_style: 'solid',
    // Social & Contact
    instagram_url: '',
    facebook_url: '',
    whatsapp_number: '',
    contact_email: '',
    contact_phone: '',
    // Messaging
    booking_description: '',
    delivery_description: '',
    featured_text: '',
  })

  useEffect(() => {
    if (!tenantUUID) return
    const loadBrandingData = async () => {
      try {
        const supabase = createClient()
        const uuid = tenantUUID
        const [brandingRes, tenantRes] = await Promise.all([
          supabase.from('tenant_branding').select('*').eq('tenant_id', uuid).single(),
          supabase.from('tenants').select('logo_url').eq('id', uuid).single(),
        ])

        if (brandingRes.data) {
          setForm(f => ({ ...f, ...brandingRes.data }))
        }
        if (tenantRes.data?.logo_url) setForm(f => ({ ...f, logo_url: tenantRes.data.logo_url }))
      } catch (err) {
        // Table doesn't exist yet, defaults are fine
      } finally {
        setLoading(false)
      }
    }
    loadBrandingData()
  }, [tenantUUID])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(field)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setForm(f => ({ ...f, [field]: data.url }))
        toast.success('Imagen subida')
      }
    } catch (err) {
      toast.error('Error al subir imagen')
    } finally {
      setUploading(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    try {
      const uuid = tenantUUID!
      const [r1, r2] = await Promise.all([
        supabase.from('tenant_branding').upsert({
          tenant_id: uuid,
          app_name: form.app_name,
          tagline: form.tagline,
          description: form.description,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
          accent_color: form.accent_color,
          background_color: form.background_color,
          button_primary_color: form.button_primary_color,
          button_secondary_color: form.button_secondary_color,
          text_primary_color: form.text_primary_color,
          text_secondary_color: form.text_secondary_color,
          border_color: form.border_color,
          font_family: form.font_family,
          heading_font: form.heading_font,
          heading_font_size: form.heading_font_size,
          body_font_size: form.body_font_size,
          font_url: `https://fonts.googleapis.com/css2?family=${form.font_family.replace(' ', '+')}:wght@400;600;700&display=swap`,
          heading_font_url: `https://fonts.googleapis.com/css2?family=${form.heading_font.replace(' ', '+')}:wght@700;800&display=swap`,
          border_radius: form.border_radius,
          button_border_radius: form.button_border_radius,
          shadow_intensity: form.shadow_intensity,
          button_style: form.button_style,
          logo_url: form.logo_url,
          hero_image_url: form.hero_image_url,
          favicon_url: form.favicon_url,
          instagram_url: form.instagram_url,
          facebook_url: form.facebook_url,
          whatsapp_number: form.whatsapp_number,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          booking_description: form.booking_description,
          delivery_description: form.delivery_description,
          featured_text: form.featured_text,
        }, { onConflict: 'tenant_id' }),
        supabase.from('tenants').update({ logo_url: form.logo_url || null }).eq('id', uuid),
      ])
      if (!r1.error && !r2.error) toast.success('Cambios guardados')
      else toast.error('Error al guardar: ' + (r1.error?.message || r2.error?.message))
    } catch (err) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (resolvingTenant || loading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>

  const imageUploadField = (label: string, field: keyof typeof form, bucket = 'images') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        {(form[field] as string) ? (
          <img src={form[field] as string} alt={label} className="w-24 h-24 rounded-lg object-cover border" />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border">🖼️</div>
        )}
        <div>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, field)} className="hidden" id={field} />
          <label htmlFor={field} className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 block">
            {uploading === field ? 'Subiendo...' : 'Cambiar imagen'}
          </label>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG — máx 2MB</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Branding Completo</h1>
        <p className="text-gray-500 text-sm mt-1">Personaliza completamente la apariencia de tu restaurante</p>
      </div>

      <div className="space-y-6">
        {/* Identidad Básica */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Identidad Básica</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la marca <span className="text-gray-400 font-normal">(como aparece en la tienda)</span></label>
            <input
              value={form.app_name}
              onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mi Restaurante"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slogan / Tagline</label>
            <input
              value={form.tagline}
              onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="El mejor sabor de la ciudad"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Cuéntanos sobre tu restaurante..."
            />
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <h2 className="font-semibold text-lg">Imágenes</h2>
          {imageUploadField('Logo', 'logo_url')}
          {imageUploadField('Imagen Hero / Banner', 'hero_image_url')}
          {imageUploadField('Favicon', 'favicon_url')}
        </div>

        {/* Colores Principales */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Colores Principales</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'primary_color', label: 'Color Primario' },
              { key: 'secondary_color', label: 'Color Secundario' },
              { key: 'accent_color', label: 'Color Acento' },
              { key: 'background_color', label: 'Fondo Principal' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={(form as any)[key] || '#000000'}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{(form as any)[key] || '#000000'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colores de Componentes */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">Colores de Componentes</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'button_primary_color', label: 'Botones Primarios' },
              { key: 'button_secondary_color', label: 'Botones Secundarios' },
              { key: 'text_primary_color', label: 'Texto Principal' },
              { key: 'text_secondary_color', label: 'Texto Secundario' },
              { key: 'border_color', label: 'Bordes' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={(form as any)[key] || '#000000'}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{(form as any)[key] || '#000000'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipografía */}
        <div className="bg-white rounded-xl border p-6 space-y-6">
          <h2 className="font-semibold text-lg">Tipografía</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Fuente para Títulos</label>
              <div className="grid grid-cols-2 gap-2">
                {GOOGLE_FONTS.map(font => (
                  <button
                    key={`heading-${font}`}
                    onClick={() => setForm(f => ({ ...f, heading_font: font }))}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors text-sm ${form.heading_font === font ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Fuente para Cuerpo</label>
              <div className="grid grid-cols-2 gap-2">
                {GOOGLE_FONTS.map(font => (
                  <button
                    key={`body-${font}`}
                    onClick={() => setForm(f => ({ ...f, font_family: font }))}
                    className={`px-3 py-2 rounded-lg border text-left transition-colors text-sm ${form.font_family === font ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño Títulos (px)</label>
                <input
                  type="number"
                  min="16"
                  max="48"
                  value={form.heading_font_size}
                  onChange={e => setForm(f => ({ ...f, heading_font_size: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño Cuerpo (px)</label>
                <input
                  type="number"
                  min="12"
                  max="20"
                  value={form.body_font_size}
                  onChange={e => setForm(f => ({ ...f, body_font_size: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estilos */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Estilos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius (px)</label>
              <input
                type="number"
                min="0"
                max="24"
                value={form.border_radius}
                onChange={e => setForm(f => ({ ...f, border_radius: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Border Radius Botones (px)</label>
              <input
                type="number"
                min="0"
                max="24"
                value={form.button_border_radius}
                onChange={e => setForm(f => ({ ...f, button_border_radius: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intensidad Sombras</label>
              <select
                value={form.shadow_intensity}
                onChange={e => setForm(f => ({ ...f, shadow_intensity: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Ninguna</option>
                <option value="light">Suave</option>
                <option value="medium">Media</option>
                <option value="strong">Fuerte</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estilo Botones</label>
              <select
                value={form.button_style}
                onChange={e => setForm(f => ({ ...f, button_style: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="solid">Sólido</option>
                <option value="outline">Contorno</option>
                <option value="ghost">Fantasma</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacto & Social */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Contacto & Redes Sociales</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Email"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={form.contact_phone}
              onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="tel"
              placeholder="WhatsApp"
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="url"
              placeholder="Instagram URL"
              value={form.instagram_url}
              onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="url"
              placeholder="Facebook URL"
              value={form.facebook_url}
              onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm col-span-2"
            />
          </div>
        </div>

        {/* Mensajería */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Mensajería Personalizada</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción para Reservas</label>
            <textarea
              value={form.booking_description}
              onChange={e => setForm(f => ({ ...f, booking_description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Ej: Reserva tu mesa ahora..."
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción para Delivery</label>
            <textarea
              value={form.delivery_description}
              onChange={e => setForm(f => ({ ...f, delivery_description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Ej: Entregamos en 30 minutos..."
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto Destacado</label>
            <textarea
              value={form.featured_text}
              onChange={e => setForm(f => ({ ...f, featured_text: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Ej: ¡Descuento 20% en órdenes mayores a $50!"
              rows={2}
            />
          </div>
        </div>

        {/* Preview */}
        <div
          className="rounded-xl border p-8 overflow-hidden"
          style={{
            backgroundColor: form.background_color,
            fontFamily: form.font_family,
          }}
        >
          <p className="text-xs text-gray-400 mb-4">VISTA PREVIA</p>
          <h3 className="font-bold mb-2" style={{ color: form.primary_color, fontSize: form.heading_font_size }}>
            {form.app_name || 'Tu Restaurante'}
          </h3>
          <p className="text-sm mb-4" style={{ color: form.secondary_color }}>
            {form.tagline || 'Slogan del restaurante'}
          </p>
          <button
            className="px-6 py-2 text-sm font-medium text-white transition"
            style={{
              backgroundColor: form.button_primary_color,
              borderRadius: form.button_border_radius,
            }}
          >
            Explorar Menú
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  )
}
