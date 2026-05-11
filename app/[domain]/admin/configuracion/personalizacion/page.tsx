'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import { deriveBrandPalette } from '@/lib/brand-colors'
import toast from 'react-hot-toast'
import { Clock, MonitorSmartphone, Plus, QrCode, ShoppingBag, ShoppingCart, Star, Utensils } from 'lucide-react'

const GOOGLE_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 'Nunito', 'Raleway', 'Poppins', 'Oswald']
const BUTTON_HOVER_EFFECTS = ['none', 'scale', 'glow', 'shadow']
const FONT_PRESETS = [
  { font: 'Inter', label: 'Moderno limpio', note: 'Claro y profesional' },
  { font: 'Poppins', label: 'Amigable', note: 'Redondo y comercial' },
  { font: 'Nunito', label: 'Cercano', note: 'Suave para comida rapida' },
  { font: 'Playfair Display', label: 'Elegante', note: 'Restaurante premium' },
]

function buildProfessionalBrandValues(base: { primary_color?: string; button_primary_color?: string }) {
  const palette = deriveBrandPalette({
    primary: base.primary_color,
    buttonPrimary: base.button_primary_color || base.primary_color,
  })

  return {
    secondary_color: palette.secondary,
    accent_color: palette.accent,
    background_color: palette.background,
    button_secondary_color: palette.buttonSecondary,
    text_primary_color: palette.text,
    text_secondary_color: palette.mutedText,
    border_color: palette.border,
    section_background_color: palette.surface,
    use_gradient: false,
    gradient_start_color: palette.background,
    gradient_end_color: palette.surface,
    gradient_direction: 'to bottom',
    border_radius: 18,
    button_border_radius: 14,
    shadow_intensity: 'medium',
    button_style: 'solid',
    button_hover_effect: 'shadow',
    button_hover_color: '',
    link_hover_color: '',
  }
}

interface PersonalizacionProps { params: Promise<{ domain: string }> }

export default function PersonalizacionPage({ params }: PersonalizacionProps) {
  const router = useRouter()
  const { domain: tenantSlug } = use(params)
  const { tenantId, loading: resolvingTenant } = useTenantResolver(tenantSlug)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('identidad')
  const [previewMode, setPreviewMode] = useState<'tienda' | 'kiosko' | 'qr'>('tienda')
  const [form, setForm] = useState({
    // Identity
    app_name: '',
    tagline: '',
    description: '',
    logo_url: '',
    favicon_url: '',
    // Colors
    primary_color: '#15130f',
    secondary_color: '#111827',
    accent_color: '#15130f',
    background_color: '#f8f5ef',
    button_primary_color: '#15130f',
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

  const applyBrandDecision = (key: keyof typeof form, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      return { ...next, ...buildProfessionalBrandValues(next), [key]: value }
    })
  }

  const handleColorChange = applyBrandDecision

  const applyFontPreset = (font: string) => {
    setForm(prev => ({
      ...prev,
      heading_font: font,
      font_family: font,
      heading_font_size: font === 'Playfair Display' ? 30 : 28,
      body_font_size: 16,
      heading_font_weight: font === 'Playfair Display' ? '700' : '800',
      body_font_weight: '500',
      letter_spacing: 0,
      line_height: 1.5,
      text_transform: 'none',
    }))
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
            setForm(f => {
              return { ...f, ...cleanBranding }
            })
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
            button_hover_effect: form.button_hover_effect,
            button_hover_color: form.button_hover_color,
            link_hover_color: form.link_hover_color,
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
    { id: 'marca', label: 'Colores y estilo' },
    { id: 'pagina', label: 'Diseño de tienda' },
    { id: 'contacto', label: 'Contacto' },
    { id: 'avanzado', label: 'Avanzado' },
  ]

  const previewName = form.app_name || 'Tu Restaurante'
  const previewTagline = form.tagline || 'Sabor fresco todos los dias'
  const previewDescription = form.description || form.welcome_message || 'Explora el menu y pide tus favoritos.'
  const generatedBrand = {
    secondary_color: form.secondary_color,
    accent_color: form.accent_color,
    background_color: form.background_color,
    button_secondary_color: form.button_secondary_color,
    text_primary_color: form.text_primary_color,
    text_secondary_color: form.text_secondary_color,
    border_color: form.border_color,
    section_background_color: form.section_background_color,
  }
  const previewSurface = generatedBrand.background_color
  const previewBackgroundStyle = form.section_background_image_url
    ? {
        backgroundColor: generatedBrand.background_color,
        backgroundImage: `linear-gradient(${generatedBrand.background_color}e8, ${generatedBrand.background_color}e8), url(${form.section_background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: previewSurface }
  const previewRadius = `${form.border_radius}px`
  const previewButtonRadius = `${form.button_border_radius}px`
  const previewHeadingStyle = {
    color: generatedBrand.text_primary_color,
    fontFamily: form.heading_font,
    fontSize: Math.min(Math.max(Number(form.heading_font_size) || 28, 20), 34),
    fontWeight: form.heading_font_weight,
    lineHeight: 1.08,
    textTransform: form.text_transform as 'none' | 'uppercase' | 'capitalize',
  }
  const previewBodyStyle = {
    color: generatedBrand.text_secondary_color,
    fontSize: Math.min(Math.max(Number(form.body_font_size) || 16, 13), 18),
    fontWeight: form.body_font_weight,
    lineHeight: form.line_height,
  }
  const previewProducts = [
    { name: 'Hamburguesa clasica', price: '12,50 EUR', image: 'B' },
    { name: 'Papas especiales', price: '6,00 EUR', image: 'P' },
    { name: 'Limonada natural', price: '3,50 EUR', image: 'L' },
  ]
  const previewModes = [
    { id: 'tienda' as const, label: 'Tienda', Icon: ShoppingBag },
    { id: 'kiosko' as const, label: 'Kiosko', Icon: MonitorSmartphone },
    { id: 'qr' as const, label: 'Carta QR', Icon: QrCode },
  ]
  const previewSwatches = [
    { label: 'Primario', color: form.primary_color },
    { label: 'Secundario', color: generatedBrand.secondary_color },
    { label: 'Precios', color: generatedBrand.accent_color },
    { label: 'Fondo', color: generatedBrand.background_color },
    { label: 'Boton', color: form.button_primary_color },
  ]
  const previewMediaStyle = {
    backgroundColor: generatedBrand.section_background_color || generatedBrand.background_color,
    color: form.primary_color,
  }

  return (
    <div className="brand-studio max-w-6xl">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Marca y tienda</p>
          <h1 className="admin-title">Centro visual de la tienda</h1>
          <p className="admin-subtitle">Un solo lugar para logo, colores, diseño público, textos, contacto, redes e imágenes visibles para tus clientes.</p>
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

      {/* Branding inteligente */}
      {activeTab === 'marca' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">Branding inteligente</p>
              <h3 className="mt-1 text-xl font-black text-gray-950">Elige solo 3 cosas</h3>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500">
                Eccofood genera fondos, tarjetas, textos, precios, bordes y sombras automaticamente para que la tienda se vea profesional.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="block text-sm font-black text-gray-900">Color principal</label>
                <p className="mt-1 min-h-10 text-xs font-semibold leading-5 text-gray-500">Encabezados, marca y presencia visual.</p>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={e => applyBrandDecision('primary_color', e.target.value)}
                    className="h-14 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  />
                  <div>
                    <p className="text-sm font-black text-gray-900">{form.primary_color}</p>
                    <p className="text-xs font-semibold text-gray-500">El sistema crea fondos y bordes.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="block text-sm font-black text-gray-900">Color de botones</label>
                <p className="mt-1 min-h-10 text-xs font-semibold leading-5 text-gray-500">Botones, precios y llamados a la accion.</p>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="color"
                    value={form.button_primary_color}
                    onChange={e => applyBrandDecision('button_primary_color', e.target.value)}
                    className="h-14 w-14 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  />
                  <div>
                    <p className="text-sm font-black text-gray-900">{form.button_primary_color}</p>
                    <p className="text-xs font-semibold text-gray-500">El sistema crea secundarios y precios.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="block text-sm font-black text-gray-900">Tipo de texto</label>
                <p className="mt-1 min-h-10 text-xs font-semibold leading-5 text-gray-500">Una fuente para toda la experiencia publica.</p>
                <div className="mt-4 grid gap-2">
                  {FONT_PRESETS.map(({ font, label, note }) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => applyFontPreset(font)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${form.font_family === font && form.heading_font === font ? 'border-gray-950 bg-white shadow-sm' : 'border-gray-200 bg-white/70 hover:bg-white'}`}
                      style={{ fontFamily: font }}
                    >
                      <span className="block text-sm font-black text-gray-950">{label}</span>
                      <span className="block text-xs font-semibold text-gray-500">{note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">Paleta generada por Eccofood</p>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {previewSwatches.map(item => (
                  <div key={item.label}>
                    <div className="h-12 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: item.color }} />
                    <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.08em] text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marca Global */}
      {false && activeTab === 'marca' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-lg mb-4">Colores Principales</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'primary_color', label: 'Encabezado y marca' },
                { key: 'secondary_color', label: 'Color Secundario' },
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
                { key: 'accent_color', label: 'Precios y textos destacados' },
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
            <h3 className="font-semibold text-lg mb-2">Diseño público de la tienda</h3>
            <p className="text-gray-600 text-sm leading-6">Desde aqui abres el editor de portada y secciones: banner, productos destacados, galeria, horarios, redes y botones rapidos. Las URLs, textos, colores e imagenes se editan en las demas pestañas de esta misma cabina para no duplicar datos.</p>
            <button
              onClick={() => router.push(`/${tenantSlug}/admin/configuracion/pagina`)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-5 text-sm font-bold text-white transition hover:bg-black"
            >
              Abrir editor de portada y secciones
            </button>
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
              <p className="mb-2 text-xs font-semibold text-gray-500">Aparece como aviso promocional en la portada de la tienda y arriba del menu.</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de fondo de tienda, menu y carta QR (opcional)</label>
              <p className="mb-2 text-xs font-semibold text-gray-500">Se muestra detras de las secciones publicas. Si usas una foto fuerte, la tienda le agrega una capa clara para que el texto se pueda leer.</p>
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
                  {form.section_background_image_url && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, section_background_image_url: '' }))}
                      className="mt-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Eliminar imagen
                    </button>
                  )}
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
        className="brand-preview-frame bg-white rounded-xl border p-8 mt-6 overflow-hidden hidden"
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

      <div className="brand-preview-frame mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Vista previa en vivo</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Asi se vera el branding publico</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">Cambia colores, logo o textos y mira una simulacion mas cercana a la tienda real.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
            {previewModes.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreviewMode(id)}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${
                  previewMode === id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-5" style={{ ...previewBackgroundStyle, fontFamily: form.font_family }}>
            <div className="mx-auto max-w-md overflow-hidden border shadow-2xl" style={{ borderColor: form.border_color, borderRadius: 28 }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: form.secondary_color }}>
                <div className="flex min-w-0 items-center gap-3">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt={previewName} className="h-16 w-24 shrink-0 object-contain drop-shadow-xl" />
                  ) : (
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-sm font-black" style={{ color: form.primary_color }}>
                      {previewName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-white">{previewName}</p>
                    <p className="truncate text-xs font-semibold text-white/70">{previewTagline}</p>
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full" style={{ backgroundColor: form.button_primary_color, color: '#fff' }}>
                  {previewMode === 'qr' ? <QrCode className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                </div>
              </div>

              <div className="space-y-4 p-4">
                {previewMode === 'tienda' && (
                  <>
                    <section className="overflow-hidden border bg-white/90 shadow-sm" style={{ borderColor: form.border_color, borderRadius: previewRadius }}>
                      <div className="p-4">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: `${form.accent_color}22`, color: form.accent_color }}>
                          <Star className="h-3.5 w-3.5" />
                          {form.featured_text || 'Especial de la casa'}
                        </div>
                        <h4 className="font-black" style={previewHeadingStyle}>{form.welcome_title || 'Bienvenido'}</h4>
                        <p className="mt-2" style={previewBodyStyle}>{previewDescription}</p>
                        <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-black text-white" style={{ backgroundColor: form.button_primary_color, borderRadius: previewButtonRadius }}>
                          <Utensils className="h-4 w-4" />
                          {form.button_add_to_cart_text || 'Agregar al carrito'}
                        </button>
                      </div>
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                      {previewProducts.slice(0, 2).map((product) => (
                        <article key={product.name} className="overflow-hidden border bg-white shadow-sm" style={{ borderColor: form.border_color, borderRadius: previewRadius }}>
                          <div className="grid h-24 place-items-center text-2xl font-black" style={previewMediaStyle}>
                            {product.image}
                          </div>
                          <div className="p-3">
                            <p className="truncate text-sm font-black" style={{ color: form.text_primary_color }}>{product.name}</p>
                            <p className="mt-1 text-sm font-black" style={{ color: form.accent_color }}>{product.price}</p>
                            <button className="mt-3 grid h-9 w-full place-items-center text-sm font-black text-white" style={{ backgroundColor: form.button_primary_color, borderRadius: previewButtonRadius }}>
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}

                {previewMode === 'kiosko' && (
                  <section className="min-h-[440px] border bg-white/95 p-5 shadow-sm" style={{ borderColor: form.border_color, borderRadius: previewRadius }}>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: form.primary_color }}>Autoservicio</p>
                        <h4 className="mt-1 font-black" style={previewHeadingStyle}>Haz tu pedido</h4>
                      </div>
                      <ShoppingBag className="h-8 w-8" style={{ color: form.primary_color }} />
                    </div>
                    <div className="space-y-3">
                      {previewProducts.map((product) => (
                        <div key={product.name} className="flex items-center gap-3 border bg-white p-3" style={{ borderColor: form.border_color, borderRadius: previewRadius }}>
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-black" style={previewMediaStyle}>
                            {product.image}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black" style={{ color: form.text_primary_color }}>{product.name}</p>
                            <p className="text-xs" style={previewBodyStyle}>{product.price}</p>
                          </div>
                          <button className="grid h-10 w-10 place-items-center text-white" style={{ backgroundColor: form.button_primary_color, borderRadius: previewButtonRadius }}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button className="mt-5 w-full py-3 text-sm font-black text-white" style={{ backgroundColor: form.button_primary_color, borderRadius: previewButtonRadius }}>
                      {form.button_checkout_text || 'Ir al pago'}
                    </button>
                  </section>
                )}

                {previewMode === 'qr' && (
                  <section className="border bg-white/95 p-5 shadow-sm" style={{ borderColor: form.border_color, borderRadius: previewRadius }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: form.primary_color }}>Carta digital</p>
                        <h4 className="mt-1 font-black" style={previewHeadingStyle}>{previewName}</h4>
                        <p className="mt-2" style={previewBodyStyle}>{previewTagline}</p>
                      </div>
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border" style={{ borderColor: form.border_color, color: form.primary_color }}>
                        <QrCode className="h-8 w-8" />
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2 overflow-hidden">
                      {['Todo', 'Entradas', 'Bebidas'].map((item, index) => (
                        <span
                          key={item}
                          className="rounded-full px-3 py-2 text-xs font-black"
                          style={{
                            backgroundColor: index === 0 ? form.button_primary_color : form.button_secondary_color,
                            color: index === 0 ? '#fff' : form.text_primary_color,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 space-y-3">
                      {previewProducts.map((product) => (
                        <div key={product.name} className="flex items-center justify-between border-b pb-3" style={{ borderColor: form.border_color }}>
                          <div>
                            <p className="text-sm font-black" style={{ color: form.text_primary_color }}>{product.name}</p>
                            <p className="mt-1 text-xs" style={{ color: form.text_secondary_color }}>{product.price}</p>
                          </div>
                          <span className="text-lg font-black" style={{ color: form.accent_color }}>{product.image}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-xs font-semibold" style={{ color: form.text_secondary_color }}>
                      <Clock className="h-4 w-4" />
                      {form.hours_content || 'Abierto hoy'}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4 border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Resumen visual</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">Esta previsualizacion mezcla identidad, colores, bordes, botones, textos y logo para detectar problemas antes de guardar.</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {previewSwatches.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="h-12 rounded-lg border border-slate-200" style={{ backgroundColor: item.color }} title={`${item.label}: ${item.color}`} />
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tarjetas de producto</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">El recuadro de muestra usa el color "Fondo de secciones", no un rosado automatico del branding.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tipografia</p>
              <p className="mt-2 text-lg font-black text-slate-950" style={{ fontFamily: form.heading_font }}>{form.heading_font}</p>
              <p className="text-sm font-semibold text-slate-500" style={{ fontFamily: form.font_family }}>Cuerpo: {form.font_family}</p>
            </div>
            <a
              href={`/${tenantSlug}/menu`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:border-slate-300"
            >
              Abrir tienda real
            </a>
          </aside>
        </div>
      </div>

    </div>
  )
}
