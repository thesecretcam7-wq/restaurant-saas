'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  type PageConfig,
  type SectionConfig,
  type TestimonialItem,
  DEFAULT_PAGE_CONFIG,
  getPageConfig,
  SECTION_META,
} from '@/lib/pageConfig'

export default function PageBuilderPage() {
  const params = useParams()
  const tenantId = params.domain as string
  const [config, setConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'style' | 'social' | 'advanced'>('hero')
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/tenant/page-config?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => setConfig(getPageConfig(data.page_config)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tenant/page-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, page_config: config }),
      })
      if (res.ok) toast.success('Cambios guardados')
      else toast.error('Error al guardar')
    } catch { toast.error('Error de conexión') }
    finally { setSaving(false) }
  }

  const updateHero = useCallback((key: string, value: any) => {
    setConfig(c => ({ ...c, hero: { ...c.hero, [key]: value } }))
  }, [])

  const updateAppearance = useCallback((key: string, value: any) => {
    setConfig(c => ({ ...c, appearance: { ...c.appearance, [key]: value } }))
  }, [])

  const updateSocial = useCallback((key: string, value: string) => {
    setConfig(c => ({ ...c, social: { ...c.social, [key]: value } }))
  }, [])

  const updateBanner = useCallback((key: string, value: any) => {
    setConfig(c => ({ ...c, banner: { ...c.banner, [key]: value } }))
  }, [])

  const updateAbout = useCallback((key: string, value: any) => {
    setConfig(c => ({ ...c, about: { ...c.about, [key]: value } }))
  }, [])

  const updateFooter = useCallback((key: string, value: any) => {
    setConfig(c => ({ ...c, footer: { ...c.footer, [key]: value } }))
  }, [])

  const toggleSection = useCallback((id: string) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s),
    }))
  }, [])

  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    setConfig(c => {
      const sections = [...c.sections].sort((a, b) => a.order - b.order)
      const idx = sections.findIndex(s => s.id === id)
      if (direction === 'up' && idx > 0) {
        const temp = sections[idx].order
        sections[idx].order = sections[idx - 1].order
        sections[idx - 1].order = temp
      } else if (direction === 'down' && idx < sections.length - 1) {
        const temp = sections[idx].order
        sections[idx].order = sections[idx + 1].order
        sections[idx + 1].order = temp
      }
      return { ...c, sections }
    })
  }, [])

  const updateSectionTitle = useCallback((id: string, title: string) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, title } : s),
    }))
  }, [])

  const uploadImage = async (file: File, key: string) => {
    setUploadingImage(key)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      return data.url || null
    } catch { return null }
    finally { setUploadingImage(null) }
  }

  const addGalleryImage = async (file: File) => {
    const url = await uploadImage(file, 'gallery')
    if (url) {
      setConfig(c => ({ ...c, gallery: { ...c.gallery, images: [...c.gallery.images, url] } }))
    }
  }

  const removeGalleryImage = (index: number) => {
    setConfig(c => ({
      ...c,
      gallery: { ...c.gallery, images: c.gallery.images.filter((_, i) => i !== index) },
    }))
  }

  const addTestimonial = () => {
    setConfig(c => ({
      ...c,
      testimonials: [...c.testimonials, { name: '', text: '', rating: 5 }],
    }))
  }

  const updateTestimonial = (index: number, field: keyof TestimonialItem, value: any) => {
    setConfig(c => ({
      ...c,
      testimonials: c.testimonials.map((t, i) => i === index ? { ...t, [field]: value } : t),
    }))
  }

  const removeTestimonial = (index: number) => {
    setConfig(c => ({ ...c, testimonials: c.testimonials.filter((_, i) => i !== index) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'hero' as const, label: 'Hero', icon: '🎨' },
    { id: 'sections' as const, label: 'Secciones', icon: '📐' },
    { id: 'style' as const, label: 'Estilo', icon: '✨' },
    { id: 'social' as const, label: 'Social', icon: '📱' },
    { id: 'advanced' as const, label: 'Avanzado', icon: '⚙️' },
  ]

  const sortedSections = [...config.sections].sort((a, b) => a.order - b.order)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personalizar Página</h1>
          <p className="text-gray-500 text-sm mt-1">Modifica cada detalle de la experiencia de tus clientes</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
          ) : (
            'Guardar cambios'
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ──── HERO TAB ────────────────────────────────────── */}
      {activeTab === 'hero' && (
        <div className="space-y-5">
          {/* Hero Style */}
          <Card title="Estilo del Hero">
            <div className="grid grid-cols-5 gap-2">
              {([
                { id: 'fullImage', label: 'Imagen', icon: '🖼️' },
                { id: 'gradient', label: 'Gradiente', icon: '🌈' },
                { id: 'split', label: 'Dividido', icon: '◐' },
                { id: 'minimal', label: 'Mínimo', icon: '◻️' },
                { id: 'parallax', label: 'Parallax', icon: '🎞️' },
              ] as const).map(style => (
                <button
                  key={style.id}
                  onClick={() => updateHero('style', style.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    config.hero.style === style.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{style.icon}</span>
                  <span className="text-[10px] font-semibold text-gray-600">{style.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Hero Size */}
          <Card title="Tamaño del Hero">
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'small', label: 'Pequeño', desc: '35vh' },
                { id: 'medium', label: 'Mediano', desc: '45vh' },
                { id: 'large', label: 'Grande', desc: '55vh' },
              ] as const).map(size => (
                <button
                  key={size.id}
                  onClick={() => updateHero('height', size.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    config.hero.height === size.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{size.label}</p>
                  <p className="text-xs text-gray-400">{size.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Overlay */}
          <Card title="Oscurecimiento del fondo">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={config.hero.overlay_opacity}
                onChange={e => updateHero('overlay_opacity', Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-mono text-gray-500 w-12 text-right">{config.hero.overlay_opacity}%</span>
            </div>
          </Card>

          {/* Hero Texts */}
          <Card title="Textos del Hero">
            <div className="space-y-3">
              <InputField
                label="Título principal"
                placeholder="(vacío = nombre del restaurante)"
                value={config.hero.title_text}
                onChange={v => updateHero('title_text', v)}
              />
              <InputField
                label="Subtítulo"
                placeholder="(vacío = slogan del branding)"
                value={config.hero.subtitle_text}
                onChange={v => updateHero('subtitle_text', v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Botón principal"
                  value={config.hero.cta_primary_text}
                  onChange={v => updateHero('cta_primary_text', v)}
                />
                <InputField
                  label="Botón secundario"
                  value={config.hero.cta_secondary_text}
                  onChange={v => updateHero('cta_secondary_text', v)}
                />
              </div>
            </div>
          </Card>

          {/* Hero Options */}
          <Card title="Opciones">
            <div className="space-y-3">
              <Toggle label="Mostrar logo" checked={config.hero.show_logo} onChange={v => updateHero('show_logo', v)} />
              <Toggle label="Mostrar píldoras de info" description="Delivery, ubicación, métodos de pago" checked={config.hero.show_info_pills} onChange={v => updateHero('show_info_pills', v)} />
            </div>
          </Card>
        </div>
      )}

      {/* ──── SECTIONS TAB ────────────────────────────────── */}
      {activeTab === 'sections' && (
        <div className="space-y-5">
          <Card title="Secciones de la página" description="Activa, desactiva y reordena las secciones de tu página de inicio">
            <div className="space-y-2">
              {sortedSections.map((section, idx) => {
                const meta = SECTION_META[section.type]
                return (
                  <div
                    key={section.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      section.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                  >
                    <span className="text-xl w-8 text-center">{meta?.icon || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <input
                        value={section.title}
                        onChange={e => updateSectionTitle(section.id, e.target.value)}
                        className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
                        placeholder={meta?.label}
                      />
                      <p className="text-xs text-gray-400 mt-0.5">{meta?.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveSection(section.id, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 'down')}
                        disabled={idx === sortedSections.length - 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 text-gray-400"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={`ml-1 w-10 h-6 rounded-full transition-colors flex items-center ${section.enabled ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                      >
                        <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Banner config */}
          {config.sections.find(s => s.id === 'banner')?.enabled && (
            <Card title="Configurar Anuncio">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <InputField label="Emoji" value={config.banner.emoji} onChange={v => updateBanner('emoji', v)} className="w-16" />
                  <div className="flex-1">
                    <InputField label="Texto del anuncio" value={config.banner.text} onChange={v => updateBanner('text', v)} placeholder="Ej: 20% de descuento hoy" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Color de fondo" value={config.banner.bg_color} onChange={v => updateBanner('bg_color', v)} />
                  <ColorField label="Color de texto" value={config.banner.text_color} onChange={v => updateBanner('text_color', v)} />
                </div>
              </div>
            </Card>
          )}

          {/* About config */}
          {config.sections.find(s => s.id === 'about')?.enabled && (
            <Card title="Configurar Sobre Nosotros">
              <div className="space-y-3">
                <InputField label="Título" value={config.about.title} onChange={v => updateAbout('title', v)} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
                  <textarea
                    value={config.about.text}
                    onChange={e => updateAbout('text', e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    rows={4}
                    placeholder="Cuenta la historia de tu restaurante..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                  <div className="flex items-center gap-3">
                    {config.about.image_url && (
                      <img src={config.about.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    )}
                    <label className="px-4 py-2 border rounded-xl text-sm cursor-pointer hover:bg-gray-50 font-medium text-gray-600">
                      {uploadingImage === 'about' ? 'Subiendo...' : 'Subir imagen'}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadImage(file, 'about')
                        if (url) updateAbout('image_url', url)
                      }} />
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Gallery config */}
          {config.sections.find(s => s.id === 'gallery')?.enabled && (
            <Card title="Configurar Galería">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'grid', label: 'Cuadrícula' },
                    { id: 'carousel', label: 'Carrusel' },
                    { id: 'masonry', label: 'Masonry' },
                  ] as const).map(style => (
                    <button
                      key={style.id}
                      onClick={() => setConfig(c => ({ ...c, gallery: { ...c.gallery, style: style.id } }))}
                      className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        config.gallery.style === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {config.gallery.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-full aspect-square object-cover rounded-xl" />
                      <button
                        onClick={() => removeGalleryImage(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <span className="text-xl text-gray-300">+</span>
                    <span className="text-[10px] text-gray-400 font-medium">Agregar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) addGalleryImage(file)
                    }} />
                  </label>
                </div>
              </div>
            </Card>
          )}

          {/* Testimonials config */}
          {config.sections.find(s => s.id === 'testimonials')?.enabled && (
            <Card title="Configurar Opiniones">
              <div className="space-y-3">
                {config.testimonials.map((t, i) => (
                  <div key={i} className="border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={t.name}
                        onChange={e => updateTestimonial(i, 'name', e.target.value)}
                        placeholder="Nombre del cliente"
                        className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                      />
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => updateTestimonial(i, 'rating', star)}
                            className={`text-lg ${star <= t.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeTestimonial(i)} className="text-red-400 hover:text-red-600 text-sm font-bold">×</button>
                    </div>
                    <textarea
                      value={t.text}
                      onChange={e => updateTestimonial(i, 'text', e.target.value)}
                      placeholder="Comentario del cliente..."
                      className="w-full px-2 py-1.5 text-sm border rounded-lg resize-none"
                      rows={2}
                    />
                  </div>
                ))}
                <button
                  onClick={addTestimonial}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + Agregar opinión
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ──── STYLE TAB ────────────────────────────────── */}
      {activeTab === 'style' && (
        <div className="space-y-5">
          {/* Border Radius */}
          <Card title="Esquinas">
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'none', label: 'Rectas', preview: 'rounded-none' },
                { id: 'small', label: 'Suaves', preview: 'rounded-lg' },
                { id: 'medium', label: 'Redondeadas', preview: 'rounded-2xl' },
                { id: 'large', label: 'Muy redondas', preview: 'rounded-3xl' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateAppearance('border_radius', opt.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    config.appearance.border_radius === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 bg-blue-400 ${opt.preview}`} />
                  <span className="text-xs font-medium text-gray-600">{opt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Card Style */}
          <Card title="Estilo de tarjetas">
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: 'flat', label: 'Plano' },
                { id: 'bordered', label: 'Con borde' },
                { id: 'shadow', label: 'Sombra' },
                { id: 'glass', label: 'Cristal' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateAppearance('card_style', opt.id)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    config.appearance.card_style === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Button Style */}
          <Card title="Estilo de botones">
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'rounded', label: 'Redondeado', preview: 'rounded-xl' },
                { id: 'pill', label: 'Píldora', preview: 'rounded-full' },
                { id: 'square', label: 'Cuadrado', preview: 'rounded-lg' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateAppearance('button_style', opt.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    config.appearance.button_style === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`px-4 py-1.5 bg-blue-500 text-white text-xs font-medium ${opt.preview}`}>Botón</div>
                  <span className="text-xs font-medium text-gray-600">{opt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Menu Layout */}
          <Card title="Layout del menú">
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'list', label: 'Lista', icon: '☰' },
                { id: 'grid', label: 'Cuadrícula', icon: '⊞' },
                { id: 'compact', label: 'Compacto', icon: '≡' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateAppearance('menu_layout', opt.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    config.appearance.menu_layout === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-xs font-medium text-gray-600">{opt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Options */}
          <Card title="Efectos">
            <div className="space-y-3">
              <Toggle label="Animaciones" description="Transiciones suaves al cargar y al hacer scroll" checked={config.appearance.animations} onChange={v => updateAppearance('animations', v)} />
            </div>
          </Card>
        </div>
      )}

      {/* ──── SOCIAL TAB ────────────────────────────────── */}
      {activeTab === 'social' && (
        <div className="space-y-5">
          <Card title="Redes Sociales" description="Agrega los links de tus redes para que aparezcan en la página">
            <div className="space-y-3">
              {([
                { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/turestaurante' },
                { key: 'facebook', label: 'Facebook', icon: '👤', placeholder: 'https://facebook.com/turestaurante' },
                { key: 'whatsapp', label: 'WhatsApp', icon: '💬', placeholder: 'https://wa.me/573001234567' },
                { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@turestaurante' },
                { key: 'twitter', label: 'X / Twitter', icon: '𝕏', placeholder: 'https://x.com/turestaurante' },
                { key: 'google_maps', label: 'Google Maps', icon: '📍', placeholder: 'https://maps.google.com/...' },
                { key: 'website', label: 'Sitio web', icon: '🌐', placeholder: 'https://turestaurante.com' },
              ] as const).map(social => (
                <div key={social.key} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{social.icon}</span>
                  <div className="flex-1">
                    <input
                      value={(config.social as any)[social.key] || ''}
                      onChange={e => updateSocial(social.key, e.target.value)}
                      placeholder={social.placeholder}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ──── ADVANCED TAB ────────────────────────────────── */}
      {activeTab === 'advanced' && (
        <div className="space-y-5">
          <Card title="Footer">
            <div className="space-y-3">
              <Toggle label='Mostrar "Powered by Restaurant.SV"' checked={config.footer.show_powered_by} onChange={v => updateFooter('show_powered_by', v)} />
              <InputField
                label="Texto personalizado en el footer"
                value={config.footer.custom_text}
                onChange={v => updateFooter('custom_text', v)}
                placeholder="Ej: © 2026 Mi Restaurante — Todos los derechos reservados"
              />
            </div>
          </Card>

          <Card title="Restablecer">
            <p className="text-sm text-gray-500 mb-3">Vuelve a la configuración predeterminada</p>
            <button
              onClick={() => {
                if (confirm('¿Estás seguro? Se perderán todos los cambios.')) {
                  setConfig(DEFAULT_PAGE_CONFIG)
                  toast.success('Configuración restablecida')
                }
              }}
              className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Restablecer todo
            </button>
          </Card>
        </div>
      )}

      {/* Floating save button (mobile) */}
      <div className="fixed bottom-6 right-6 sm:hidden z-50">
        <button
          onClick={save}
          disabled={saving}
          className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Reusable UI components ────────────────────────────────────────────────

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  )
}

function InputField({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5"
      />
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 font-mono">{value}</p>
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex items-center ${checked ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
      >
        <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
      </button>
    </label>
  )
}
