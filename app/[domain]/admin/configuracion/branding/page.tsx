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
  })

  useEffect(() => {
    if (!tenantUUID) return
    const loadBrandingData = async () => {
      try {
        // Use API endpoint to bypass RLS issues
        const res = await fetch(`/api/tenant/branding?tenantId=${tenantUUID}`)
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
    try {
      const uuid = tenantUUID!
      const brandingPayload = {
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
        heading_font_weight: form.heading_font_weight,
        body_font_weight: form.body_font_weight,
        letter_spacing: form.letter_spacing,
        line_height: form.line_height,
        text_transform: form.text_transform,
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
        button_hover_effect: form.button_hover_effect,
        button_hover_color: form.button_hover_color,
        link_hover_color: form.link_hover_color,
        link_hover_underline: form.link_hover_underline,
        transition_speed: form.transition_speed,
      }

      const res = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: uuid, branding: brandingPayload }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Cambios guardados')
      } else {
        toast.error('Error al guardar: ' + (data.error || 'Unknown error'))
      }
    } catch (err) {
      toast.error('Error al guardar')
      console.error(err)
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

        {/* Tipografía Avanzada */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Tipografía Avanzada</h2>
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

        {/* Textos Personalizados */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Textos Personalizados</h2>
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

        {/* Fondos e Imágenes */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Fondos e Imágenes</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Color de Fondo de Secciones</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.section_background_color || '#FFFFFF'}
                  onChange={e => setForm(f => ({ ...f, section_background_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <div>
                  <p className="text-sm text-gray-600">{form.section_background_color || '#FFFFFF'}</p>
                </div>
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
        </div>

        {/* Efectos Hover e Interactividad */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-lg mb-4">Efectos Hover e Interactividad</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Efecto Botones al Pasar</label>
              <select
                value={form.button_hover_effect}
                onChange={e => setForm(f => ({ ...f, button_hover_effect: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Ninguno</option>
                <option value="scale">Escala</option>
                <option value="glow">Brillo</option>
                <option value="shadow">Sombra</option>
                <option value="color-shift">Cambio de Color</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Color Hover Botones</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.button_hover_color || form.primary_color}
                  onChange={e => setForm(f => ({ ...f, button_hover_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <p className="text-xs text-gray-400">{form.button_hover_color || 'Por defecto'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Color Hover Enlaces</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.link_hover_color || form.primary_color}
                  onChange={e => setForm(f => ({ ...f, link_hover_color: e.target.value }))}
                  className="w-12 h-12 rounded-lg border cursor-pointer p-1"
                />
                <p className="text-xs text-gray-400">{form.link_hover_color || 'Por defecto'}</p>
              </div>
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

        {/* Preview */}
        <div
          className="rounded-xl border p-8 overflow-hidden"
          style={{
            backgroundColor: form.background_color,
            fontFamily: form.font_family,
            backgroundImage: form.use_gradient ? `linear-gradient(${form.gradient_direction}, ${form.gradient_start_color}, ${form.gradient_end_color})` : undefined,
            backgroundSize: form.section_background_image_url ? 'cover' : undefined,
            backgroundPosition: 'center',
          }}
        >
          <p className="text-xs text-gray-400 mb-4">VISTA PREVIA</p>
          <h3
            className="mb-2"
            style={{
              color: form.primary_color,
              fontSize: form.heading_font_size,
              fontWeight: parseInt(form.heading_font_weight),
              letterSpacing: `${form.letter_spacing}em`,
              lineHeight: form.line_height,
              textTransform: form.text_transform as any,
            }}
          >
            {form.app_name || 'Tu Restaurante'}
          </h3>
          <p
            className="text-sm mb-4"
            style={{
              color: form.secondary_color,
              fontWeight: parseInt(form.body_font_weight),
              letterSpacing: `${form.letter_spacing}em`,
              lineHeight: form.line_height,
            }}
          >
            {form.tagline || 'Slogan del restaurante'}
          </p>
          <button
            className="px-6 py-2 text-sm font-medium text-white rounded transition-all"
            style={{
              backgroundColor: form.button_primary_color,
              borderRadius: form.button_border_radius,
              transitionDuration: form.transition_speed === 'slow' ? '500ms' : form.transition_speed === 'fast' ? '100ms' : '300ms',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              if (form.button_hover_effect === 'scale') (e.target as HTMLElement).style.transform = 'scale(1.05)'
              if (form.button_hover_effect === 'glow') (e.target as HTMLElement).style.boxShadow = `0 0 12px ${form.button_primary_color}80`
              if (form.button_hover_effect === 'shadow') (e.target as HTMLElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'
              if (form.button_hover_effect === 'color-shift' && form.button_hover_color) (e.target as HTMLElement).style.backgroundColor = form.button_hover_color
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.transform = 'scale(1)'
              (e.target as HTMLElement).style.boxShadow = 'none'
              (e.target as HTMLElement).style.backgroundColor = form.button_primary_color
            }}
          >
            {form.welcome_title || 'Explorar Menú'}
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
