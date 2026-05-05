'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import toast from 'react-hot-toast'

const GOOGLE_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 'Nunito', 'Raleway', 'Poppins', 'Oswald']
const BUTTON_HOVER_EFFECTS = ['none', 'scale', 'glow', 'shadow']

interface PersonalizacionProps { params: Promise<{ domain: string }> }

export default function PersonalizacionPage({ params }: PersonalizacionProps) {
  const router = useRouter()
  const { domain: tenantSlug } = use(params)
  const { tenantId, loading: resolvingTenant } = useTenantResolver(tenantSlug)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identidad')
  const [form, setForm] = useState({
    // Identity
    app_name: '',
    tagline: '',
    description: '',
    logo_url: '',
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
    heading_font_weight: '700',
    body_font_weight: '400',
    letter_spacing: 0,
    line_height: 1.5,
    text_transform: 'none',
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
    // Customizable Texts
    welcome_title: 'Bienvenido',
    welcome_message: 'Explora nuestro menú',
    footer_text: 'Gracias por tu compra',
    hours_title: 'Horario',
    hours_content: '',
    button_add_to_cart_text: 'Agregar al carrito',
    button_checkout_text: 'Ir al pago',
    button_reserve_text: 'Reservar mesa',
    empty_cart_message: 'Tu carrito está vacío',
    // Backgrounds
    section_background_color: '#FFFFFF',
    section_background_image_url: '',
    use_gradient: false,
    gradient_start_color: '#FFFFFF',
    gradient_end_color: '#F3F4F6',
    gradient_direction: 'to right',
    // Hover Effects
    button_hover_effect: 'scale',
    button_hover_color: '',
    link_hover_color: '',
    link_hover_underline: true,
    transition_speed: 'normal',
    // Page Config
    page_config: {} as any,
  })

  const handleColorChange = (key: keyof typeof form, value: string) => {
    setForm(prev => {
      const next: typeof prev = { ...prev, [key]: value }

      if (key === 'primary_color') {
        const oldPrimary = prev.primary_color
        const shouldSyncAccent = !prev.accent_color || prev.accent_color === oldPrimary || prev.accent_color === '#F59E0B'
        const shouldSyncButton = !prev.button_primary_color || prev.button_primary_color === oldPrimary || prev.button_primary_color === '#3B82F6'
        if (shouldSyncAccent) next.accent_color = value
        if (shouldSyncButton) next.button_primary_color = value
      }

      return next
    })
  }

  useEffect(() => {
    if (!tenantId) return

    const loadBrandingData = async () => {
      try {
        const res = await fetch(`/api/tenant/branding?tenantId=${tenantId}`)
        if (res.ok) {
          const json = await res.json()
          if (json.branding) {
            // Filter out null values to keep defaults
            const cleanBranding: Record<string, any> = {}
            Object.entries(json.branding).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                cleanBranding[key] = value
              }
            })
            setForm(f => ({ ...f, ...cleanBranding }))
          }
          if (json.tenant?.logo_url) {
            setForm(f => ({ ...f, logo_url: json.tenant.logo_url }))
          }
        }
      } catch (err) {
        console.error('Error loading branding:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBrandingData()
  }, [tenantId])

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
    try {
      const res = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          branding: {
            app_name: form.app_name,
            tagline: form.tagline,
            description: form.description,
            logo_url: form.logo_url,
            favicon_url: form.favicon_url,
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
            heading_font_weight: form.heading_font_weight,
            body_font_weight: form.body_font_weight,
            letter_spacing: form.letter_spacing,
            line_height: form.line_height,
            text_transform: form.text_transform,
            border_radius: form.border_radius,
            button_border_radius: form.button_border_radius,
            shadow_intensity: form.shadow_intensity,
            button_style: form.button_style,
            instagram_url: form.instagram_url,
            facebook_url: form.facebook_url,
            whatsapp_number: form.whatsapp_number,
            contact_email: form.contact_email,
            contact_phone: form.contact_phone,
            booking_description: form.booking_description,
            delivery_description: form.delivery_description,
            featured_text: form.featured_text,
            welcome_title: form.welcome_title,
            welcome_message: form.welcome_message,
            footer_text: form.footer_text,
            hours_title: form.hours_title,
            hours_content: form.hours_content,
            button_add_to_cart_text: form.button_add_to_cart_text,
            button_checkout_text: form.button_checkout_text,
            button_reserve_text: form.button_reserve_text,
            empty_cart_message: form.empty_cart_message,
            section_background_color: form.section_background_color,
            section_background_image_url: form.section_background_image_url,
            use_gradient: form.use_gradient,
            gradient_start_color: form.gradient_start_color,
            gradient_end_color: form.gradient_end_color,
            gradient_direction: form.gradient_direction,
            button_hover_effect: BUTTON_HOVER_EFFECTS.includes(form.button_hover_effect) ? form.button_hover_effect : 'scale',
            button_hover_color: '',
            link_hover_color: '',
            link_hover_underline: form.link_hover_underline,
            transition_speed: form.transition_speed,
          }
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Cambios guardados')
      } else {
        toast.error('Error al guardar: ' + data.error)
      }
    } catch (err) {
      toast.error('Error al guardar: ' + (err as any).message)
    } finally {
      setSaving(false)
    }
  }

  if (resolvingTenant || loading) return (
    <div className="admin-panel flex h-64 items-center justify-center text-black/45">
      Cargando personalizacion...
    </div>
  )

  const imageUploadField = (label: string, field: keyof typeof form) => (
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

  const tabs = [
    { id: 'identidad', label: 'Identidad' },
    { id: 'marca', label: 'Marca Global' },
    { id: 'pagina', label: 'Diseño de Página' },
    { id: 'contacto', label: 'Contacto' },
    { id: 'avanzado', label: 'Personalización Avanzada' },
  ]

  return (
    <div className="brand-studio max-w-6xl">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Marca</p>
          <h1 className="admin-title">Personalizacion</h1>
          <p className="admin-subtitle">Define identidad, colores, textos, contacto y apariencia publica del restaurante desde una sola cabina visual.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-button-primary"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="brand-tabs mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`brand-tab ${
              activeTab === tab.id
                ? 'brand-tab-active'
                : ''
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Identidad */}
      {activeTab === 'identidad' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del restaurante *</label>
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

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Imágenes</h3>
              <div className="space-y-6">
                {imageUploadField('Logo', 'logo_url')}
                {imageUploadField('Favicon', 'favicon_url')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marca Global */}
      {activeTab === 'marca' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">Colores Principales</h3>
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
                    value={(form as any)[key]}
                    onChange={e => handleColorChange(key as keyof typeof form, e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{(form as any)[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">Colores de Componentes</h3>
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
                    value={(form as any)[key]}
                    onChange={e => handleColorChange(key as keyof typeof form, e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{(form as any)[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-6">
            <h3 className="font-semibold text-lg">Tipografía</h3>
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

            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Estilos</h4>
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
          </div>
        </div>
      )}

      {/* Diseño de Página */}
      {activeTab === 'pagina' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">📄 Diseño de tu Página</h3>
            <p className="text-gray-600 text-sm mb-6">Configura qué secciones mostrar en tu página web de restaurante</p>

            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-3">✨ Haz clic en cualquier botón para configurar esa sección de tu página</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push(`/${tenantSlug}/admin/configuracion/pagina`)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left cursor-pointer"
                >
                  <div className="font-medium text-gray-900 mb-1">🎨 Hero & Banner</div>
                  <div className="text-xs text-gray-500">Imagen principal, títulos</div>
                </button>

                <button
                  onClick={() => router.push(`/${tenantSlug}/admin/configuracion/pagina`)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left cursor-pointer"
                >
                  <div className="font-medium text-gray-900 mb-1">⭐ Destacados</div>
                  <div className="text-xs text-gray-500">Productos más populares</div>
                </button>

                <button
                  onClick={() => router.push(`/${tenantSlug}/admin/configuracion/pagina`)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left cursor-pointer"
                >
                  <div className="font-medium text-gray-900 mb-1">📍 Información</div>
                  <div className="text-xs text-gray-500">Ubicación, horarios, contacto</div>
                </button>

                <button
                  onClick={() => router.push(`/${tenantSlug}/admin/configuracion/pagina`)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left cursor-pointer"
                >
                  <div className="font-medium text-gray-900 mb-1">🎯 Acciones</div>
                  <div className="text-xs text-gray-500">Botones menú, reservar, delivery</div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">🔗 Links de Redirección</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL de Menú Completo</label>
                <input
                  type="url"
                  placeholder="https://tudominio.com/menu"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL para Reservar</label>
                <input
                  type="url"
                  placeholder="https://reservas.tudominio.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL para Delivery</label>
                <input
                  type="url"
                  placeholder="https://delivery.tudominio.com"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contacto */}
      {activeTab === 'contacto' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Información de Contacto</h3>
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
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Redes Sociales</h3>
            <input
              type="url"
              placeholder="Instagram URL"
              value={form.instagram_url}
              onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <input
              type="url"
              placeholder="Facebook URL"
              value={form.facebook_url}
              onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Mensajería Personalizada</h3>
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
        </div>
      )}

      {/* Personalización Avanzada */}
      {activeTab === 'avanzado' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Tipografía Avanzada</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Títulos</label>
                <select
                  value={form.heading_font_weight}
                  onChange={e => setForm(f => ({ ...f, heading_font_weight: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semibold (600)</option>
                  <option value="700">Bold (700)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Cuerpo</label>
                <select
                  value={form.body_font_weight}
                  onChange={e => setForm(f => ({ ...f, body_font_weight: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Espaciado de Letras (em)</label>
                <input
                  type="number"
                  min="-0.05"
                  max="0.2"
                  step="0.01"
                  value={form.letter_spacing}
                  onChange={e => setForm(f => ({ ...f, letter_spacing: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Altura de Línea</label>
                <input
                  type="number"
                  min="1.2"
                  max="2"
                  step="0.1"
                  value={form.line_height}
                  onChange={e => setForm(f => ({ ...f, line_height: parseFloat(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Transformación de Texto</label>
                <select
                  value={form.text_transform}
                  onChange={e => setForm(f => ({ ...f, text_transform: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Normal</option>
                  <option value="uppercase">MAYÚSCULAS</option>
                  <option value="capitalize">Capitalizar Palabras</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Textos Personalizados</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título de Bienvenida</label>
                <input
                  type="text"
                  value={form.welcome_title}
                  onChange={e => setForm(f => ({ ...f, welcome_title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Bienvenido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje de Bienvenida</label>
                <input
                  type="text"
                  value={form.welcome_message}
                  onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Explora nuestro menú"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Botón Agregar al Carrito</label>
                <input
                  type="text"
                  value={form.button_add_to_cart_text}
                  onChange={e => setForm(f => ({ ...f, button_add_to_cart_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Agregar al carrito"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Botón Ir al Pago</label>
                <input
                  type="text"
                  value={form.button_checkout_text}
                  onChange={e => setForm(f => ({ ...f, button_checkout_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Ir al pago"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Botón Reservar Mesa</label>
                <input
                  type="text"
                  value={form.button_reserve_text}
                  onChange={e => setForm(f => ({ ...f, button_reserve_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Reservar mesa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje Carrito Vacío</label>
                <input
                  type="text"
                  value={form.empty_cart_message}
                  onChange={e => setForm(f => ({ ...f, empty_cart_message: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Tu carrito está vacío"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Título de Horario</label>
                <input
                  type="text"
                  value={form.hours_title}
                  onChange={e => setForm(f => ({ ...f, hours_title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Horario"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido Horario</label>
                <textarea
                  value={form.hours_content}
                  onChange={e => setForm(f => ({ ...f, hours_content: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Lunes a Viernes: 11am - 10pm&#10;Sábado - Domingo: 12pm - 11pm"
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Pie de Página</label>
                <input
                  type="text"
                  value={form.footer_text}
                  onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ej: Gracias por tu compra"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Fondos e Imágenes</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Color de Fondo de Secciones</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.section_background_color || '#FFFFFF'}
                  onChange={e => setForm(f => ({ ...f, section_background_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <p className="text-sm text-gray-600">{form.section_background_color || '#FFFFFF'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de Fondo (opcional)</label>
              <div className="flex items-center gap-4">
                {form.section_background_image_url ? (
                  <img src={form.section_background_image_url} alt="Background" className="w-24 h-24 rounded-lg object-cover border" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-2xl border">🖼️</div>
                )}
                <div>
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'section_background_image_url')} className="hidden" id="section_bg" />
                  <label htmlFor="section_bg" className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 block">
                    {uploading === 'section_background_image_url' ? 'Subiendo...' : 'Cambiar imagen'}
                  </label>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG — máx 2MB</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.use_gradient}
                  onChange={e => setForm(f => ({ ...f, use_gradient: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Usar Gradiente
              </label>
              {form.use_gradient && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Inicio</label>
                    <input
                      type="color"
                      value={form.gradient_start_color}
                      onChange={e => setForm(f => ({ ...f, gradient_start_color: e.target.value }))}
                      className="w-full h-10 rounded-lg border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Fin</label>
                    <input
                      type="color"
                      value={form.gradient_end_color}
                      onChange={e => setForm(f => ({ ...f, gradient_end_color: e.target.value }))}
                      className="w-full h-10 rounded-lg border cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                    <select
                      value={form.gradient_direction}
                      onChange={e => setForm(f => ({ ...f, gradient_direction: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="to right">Derecha</option>
                      <option value="to bottom">Abajo</option>
                      <option value="to bottom-right">Diagonal</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-lg mb-4">Efectos Hover e Interactividad</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efecto Botones al Pasar</label>
                <select
                  value={BUTTON_HOVER_EFFECTS.includes(form.button_hover_effect) ? form.button_hover_effect : 'scale'}
                  onChange={e => setForm(f => ({ ...f, button_hover_effect: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">Ninguno</option>
                  <option value="scale">Escala</option>
                  <option value="glow">Brillo</option>
                  <option value="shadow">Sombra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Velocidad Transiciones</label>
                <select
                  value={form.transition_speed}
                  onChange={e => setForm(f => ({ ...f, transition_speed: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="slow">Lenta</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Rápida</option>
                </select>
              </div>
              <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Los colores al pasar el mouse se calculan automaticamente desde el color principal y el color del boton.
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.link_hover_underline}
                    onChange={e => setForm(f => ({ ...f, link_hover_underline: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Subrayar Enlaces al Pasar
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        className="brand-preview-frame bg-white rounded-xl border p-8 mt-6 overflow-hidden"
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
        className="admin-button-primary mt-6 w-full disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar Cambios'}
      </button>
    </div>
  )
}
