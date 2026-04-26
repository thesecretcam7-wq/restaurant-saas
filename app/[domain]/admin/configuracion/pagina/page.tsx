'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  type PageConfig,
  type SectionConfig,
  type TestimonialItem,
  DEFAULT_PAGE_CONFIG,
  getPageConfig,
  SECTION_META,
} from '@/lib/pageConfig'

type PanelId = 'home' | 'hero' | 'section' | 'appearance' | 'social' | 'advanced'

export default function PageBuilderPage() {
  const params = useParams()
  const tenantId = params.domain as string
  const [config, setConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<PanelId>('home')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
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

  const updateHero = useCallback((key: string, value: any) =>
    setConfig(c => ({ ...c, hero: { ...c.hero, [key]: value } })), [])

  const updateAppearance = useCallback((key: string, value: any) =>
    setConfig(c => ({ ...c, appearance: { ...c.appearance, [key]: value } })), [])

  const updateSocial = useCallback((key: string, value: string) =>
    setConfig(c => ({ ...c, social: { ...c.social, [key]: value } })), [])

  const updateBanner = useCallback((key: string, value: any) =>
    setConfig(c => ({ ...c, banner: { ...c.banner, [key]: value } })), [])

  const updateAbout = useCallback((key: string, value: any) =>
    setConfig(c => ({ ...c, about: { ...c.about, [key]: value } })), [])

  const updateFooter = useCallback((key: string, value: any) =>
    setConfig(c => ({ ...c, footer: { ...c.footer, [key]: value } })), [])

  const toggleSection = useCallback((id: string) =>
    setConfig(c => {
      const updatedConfig = {
        ...c,
        sections: c.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s),
      }
      // Also toggle banner.enabled when banner section is toggled
      if (id === 'banner') {
        updatedConfig.banner = { ...updatedConfig.banner, enabled: !updatedConfig.banner.enabled }
      }
      return updatedConfig
    }), [])

  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    setConfig(c => {
      const sections = [...c.sections].sort((a, b) => a.order - b.order)
      const idx = sections.findIndex(s => s.id === id)
      if (direction === 'up' && idx > 0) {
        const tmp = sections[idx].order
        sections[idx].order = sections[idx - 1].order
        sections[idx - 1].order = tmp
      } else if (direction === 'down' && idx < sections.length - 1) {
        const tmp = sections[idx].order
        sections[idx].order = sections[idx + 1].order
        sections[idx + 1].order = tmp
      }
      return { ...c, sections }
    })
  }, [])

  const updateSectionConfig = useCallback((id: string, key: string, value: any) =>
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s),
    })), [])

  const uploadImage = async (file: File, key: string): Promise<string | null> => {
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
    if (url) setConfig(c => ({ ...c, gallery: { ...c.gallery, images: [...c.gallery.images, url] } }))
  }

  const removeGalleryImage = (i: number) =>
    setConfig(c => ({ ...c, gallery: { ...c.gallery, images: c.gallery.images.filter((_, idx) => idx !== i) } }))

  const addTestimonial = () =>
    setConfig(c => ({ ...c, testimonials: [...c.testimonials, { name: '', text: '', rating: 5 }] }))

  const updateTestimonial = (i: number, field: keyof TestimonialItem, value: any) =>
    setConfig(c => ({ ...c, testimonials: c.testimonials.map((t, idx) => idx === i ? { ...t, [field]: value } : t) }))

  const removeTestimonial = (i: number) =>
    setConfig(c => ({ ...c, testimonials: c.testimonials.filter((_, idx) => idx !== i) }))

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  const sortedSections = [...config.sections].sort((a, b) => a.order - b.order)
  const selectedSection = config.sections.find(s => s.id === selectedSectionId) ?? null

  const panelTitle: Record<PanelId, string> = {
    home: 'Diseño de Página',
    hero: 'Hero',
    section: selectedSection ? (SECTION_META[selectedSection.type]?.label ?? selectedSection.title) : 'Sección',
    appearance: 'Apariencia',
    social: 'Redes Sociales',
    advanced: 'Avanzado',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* ── Left panel ────────────────────────────────── */}
      <aside className="w-72 bg-white border-r flex flex-col overflow-hidden shadow-sm flex-shrink-0">

        {/* Header */}
        <div className="px-4 h-14 border-b flex items-center gap-2 flex-shrink-0 bg-white">
          {panel !== 'home' && (
            <button
              onClick={() => setPanel('home')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          <span className="font-semibold text-sm text-gray-900">{panelTitle[panel]}</span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Home: module list ── */}
          {panel === 'home' && (
            <div className="p-3 space-y-0.5">
              <NavRow
                icon="🎨"
                label="Hero"
                desc="Banner principal de la tienda"
                onClick={() => setPanel('hero')}
              />

              <SectionLabel>Secciones de la página</SectionLabel>

              {sortedSections.map((section, idx) => {
                const meta = SECTION_META[section.type]
                return (
                  <div
                    key={section.id}
                    className={`flex items-center gap-1 px-2 py-2.5 rounded-xl group transition-colors hover:bg-gray-50 ${!section.enabled ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => { setSelectedSectionId(section.id); setPanel('section') }}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <span className="text-base w-7 text-center flex-shrink-0">{meta?.icon ?? '📄'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{section.title}</p>
                        <p className="text-xs text-gray-400 truncate">{meta?.description}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveSection(section.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-400"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 'down')}
                        disabled={idx === sortedSections.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-20 text-gray-400"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={`w-9 h-5 rounded-full transition-all flex items-center ml-1 flex-shrink-0 ${section.enabled ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'}`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow-sm mx-0.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              <SectionLabel className="mt-2">Ajustes globales</SectionLabel>

              <NavRow icon="✨" label="Apariencia" desc="Esquinas, tarjetas, botones, layout" onClick={() => setPanel('appearance')} />
              <NavRow icon="📱" label="Redes Sociales" desc="Instagram, WhatsApp, TikTok..." onClick={() => setPanel('social')} />
              <NavRow icon="⚙️" label="Avanzado" desc="Footer, restablecimiento" onClick={() => setPanel('advanced')} />

              <div className="px-1 pt-2">
                <Link
                  href={`/${tenantId}`}
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                >
                  <span>👁️</span>
                  <span>Ver tienda en vivo</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                </Link>
              </div>
            </div>
          )}

          {/* ── Hero panel ── */}
          {panel === 'hero' && (
            <div className="p-4 space-y-5">
              <Block title="Estilo">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'fullImage', label: 'Imagen', icon: '🖼️' },
                    { id: 'gradient', label: 'Gradiente', icon: '🌈' },
                    { id: 'split', label: 'Dividido', icon: '◐' },
                    { id: 'minimal', label: 'Mínimo', icon: '◻️' },
                    { id: 'parallax', label: 'Parallax', icon: '🎞️' },
                  ] as const).map(style => (
                    <StyleBtn key={style.id} icon={style.icon} label={style.label} active={config.hero.style === style.id} onClick={() => updateHero('style', style.id)} />
                  ))}
                </div>
              </Block>

              {config.hero.style === 'fullImage' && (
                <Block title="Imagen del Hero">
                  <div className="space-y-2">
                    {config.hero.image_url && (
                      <img src={config.hero.image_url} alt="" className="w-full h-32 rounded-xl object-cover" />
                    )}
                    <label className="block">
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await uploadImage(file, 'hero')
                        if (url) updateHero('image_url', url)
                      }} />
                      <span className="inline-block w-full text-center px-4 py-2 border rounded-xl text-sm cursor-pointer hover:bg-gray-50 font-medium text-gray-600 transition-colors">
                        {uploadingImage === 'hero' ? 'Subiendo...' : 'Subir imagen'}
                      </span>
                    </label>
                    <p className="text-xs text-gray-400">Recomendado 1920×600px</p>
                  </div>
                </Block>
              )}

              <Block title="Tamaño">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'small', label: 'Pequeño', desc: '35vh' },
                    { id: 'medium', label: 'Mediano', desc: '45vh' },
                    { id: 'large', label: 'Grande', desc: '55vh' },
                  ] as const).map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateHero('height', s.id)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${config.hero.height === s.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                      <p className="text-[10px] text-gray-400">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Oscurecimiento del fondo">
                <div className="flex items-center gap-3">
                  <input
                    type="range" min="0" max="100"
                    value={config.hero.overlay_opacity}
                    onChange={e => updateHero('overlay_opacity', Number(e.target.value))}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-sm font-mono text-gray-500 w-10 text-right">{config.hero.overlay_opacity}%</span>
                </div>
              </Block>

              <Block title="Textos">
                <div className="space-y-3">
                  <Field label="Título" placeholder="(vacío = nombre del restaurante)" value={config.hero.title_text} onChange={v => updateHero('title_text', v)} />
                  <Field label="Subtítulo" placeholder="(vacío = slogan)" value={config.hero.subtitle_text} onChange={v => updateHero('subtitle_text', v)} />
                  <Field label="Botón principal" value={config.hero.cta_primary_text} onChange={v => updateHero('cta_primary_text', v)} />
                  <Field label="Botón secundario" value={config.hero.cta_secondary_text} onChange={v => updateHero('cta_secondary_text', v)} />
                </div>
              </Block>

              <Block title="Opciones">
                <div className="space-y-3">
                  <Toggle label="Mostrar logo" checked={config.hero.show_logo} onChange={v => updateHero('show_logo', v)} />
                  <Toggle label="Píldoras de info" description="Delivery, ubicación, métodos de pago" checked={config.hero.show_info_pills} onChange={v => updateHero('show_info_pills', v)} />
                </div>
              </Block>
            </div>
          )}

          {/* ── Section panel ── */}
          {panel === 'section' && selectedSection && (
            <div className="p-4 space-y-5">
              {/* Enabled toggle */}
              <Block title="Visibilidad">
                <Toggle
                  label="Sección activa"
                  description="Mostrar en la página de la tienda"
                  checked={selectedSection.enabled}
                  onChange={() => toggleSection(selectedSection.id)}
                />
              </Block>

              {/* Banner settings */}
              {selectedSection.type === 'banner' && (
                <Block title="Contenido del anuncio">
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <Field label="Emoji" value={config.banner.emoji} onChange={v => updateBanner('emoji', v)} />
                      <div className="col-span-3">
                        <Field label="Texto" value={config.banner.text} onChange={v => updateBanner('text', v)} placeholder="Ej: 20% de descuento hoy" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ColorRow label="Fondo" value={config.banner.bg_color} onChange={v => updateBanner('bg_color', v)} />
                      <ColorRow label="Texto" value={config.banner.text_color} onChange={v => updateBanner('text_color', v)} />
                    </div>
                    <div className="p-3 rounded-xl border text-center text-sm font-medium" style={{ backgroundColor: config.banner.bg_color, color: config.banner.text_color }}>
                      {config.banner.emoji} {config.banner.text || 'Vista previa del anuncio'}
                    </div>
                  </div>
                </Block>
              )}

              {/* Featured settings */}
              {selectedSection.type === 'featured' && (
                <Block title="Cantidad de productos">
                  <Field
                    label="Mostrar"
                    type="number"
                    value={String(selectedSection.config.count ?? 8)}
                    onChange={v => updateSectionConfig(selectedSection.id, 'count', parseInt(v))}
                  />
                  <p className="text-xs text-gray-400 mt-2">Se mostrarán los productos marcados como destacados</p>
                </Block>
              )}

              {/* About settings */}
              {selectedSection.type === 'about' && (
                <Block title="Sobre nosotros">
                  <div className="space-y-3">
                    <Field label="Título" value={config.about.title} onChange={v => updateAbout('title', v)} />
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Historia</label>
                      <textarea
                        value={config.about.text}
                        onChange={e => updateAbout('text', e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        rows={4}
                        placeholder="Cuéntanos la historia de tu restaurante..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Imagen</label>
                      <div className="flex items-center gap-2">
                        {config.about.image_url && (
                          <img src={config.about.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <label className="flex-1 text-center px-3 py-2 border rounded-xl text-sm cursor-pointer hover:bg-gray-50 font-medium text-gray-600 transition-colors">
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
                </Block>
              )}

              {/* Gallery settings */}
              {selectedSection.type === 'gallery' && (
                <>
                  <Block title="Estilo de galería">
                    <div className="grid grid-cols-3 gap-2">
                      {(['grid', 'carousel', 'masonry'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setConfig(c => ({ ...c, gallery: { ...c.gallery, style: s } }))}
                          className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${config.gallery.style === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                        >
                          {s === 'grid' ? 'Cuadrícula' : s === 'carousel' ? 'Carrusel' : 'Masonry'}
                        </button>
                      ))}
                    </div>
                  </Block>
                  <Block title="Imágenes">
                    <div className="grid grid-cols-3 gap-2">
                      {config.gallery.images.map((img, i) => (
                        <div key={i} className="relative group aspect-square">
                          <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                          <button
                            onClick={() => removeGalleryImage(i)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >×</button>
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
                  </Block>
                </>
              )}

              {/* Testimonials settings */}
              {selectedSection.type === 'testimonials' && (
                <Block title="Opiniones de clientes">
                  <div className="space-y-3">
                    {config.testimonials.map((t, i) => (
                      <div key={i} className="border rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={t.name}
                            onChange={e => updateTestimonial(i, 'name', e.target.value)}
                            placeholder="Nombre del cliente"
                            className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={() => removeTestimonial(i)} className="text-red-400 hover:text-red-600 font-bold text-sm flex-shrink-0">×</button>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} onClick={() => updateTestimonial(i, 'rating', star)} className={`text-base ${star <= t.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                          ))}
                        </div>
                        <textarea
                          value={t.text}
                          onChange={e => updateTestimonial(i, 'text', e.target.value)}
                          placeholder="Comentario del cliente..."
                          className="w-full px-2 py-1.5 text-sm border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                </Block>
              )}

              {/* Info / Hours / Actions / Social — no configurable settings */}
              {['info', 'hours', 'actions', 'social'].includes(selectedSection.type) && (
                <div className="px-1">
                  <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                    <p className="text-2xl mb-2">{SECTION_META[selectedSection.type]?.icon}</p>
                    <p className="text-sm font-medium text-gray-700">{SECTION_META[selectedSection.type]?.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{SECTION_META[selectedSection.type]?.description}</p>
                    <p className="text-xs text-gray-400 mt-3">Esta sección se configura automáticamente con los datos de tu restaurante</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Appearance panel ── */}
          {panel === 'appearance' && (
            <div className="p-4 space-y-5">
              <Block title="Esquinas">
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: 'none', label: 'Rectas', cls: 'rounded-none' },
                    { id: 'small', label: 'Suaves', cls: 'rounded-lg' },
                    { id: 'medium', label: 'Redondas', cls: 'rounded-2xl' },
                    { id: 'large', label: 'Muy redondas', cls: 'rounded-3xl' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateAppearance('border_radius', opt.id)}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${config.appearance.border_radius === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className={`w-8 h-8 bg-blue-400 ${opt.cls}`} />
                      <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Estilo de tarjetas">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'flat', label: 'Plano' },
                    { id: 'bordered', label: 'Con borde' },
                    { id: 'shadow', label: 'Sombra' },
                    { id: 'glass', label: 'Cristal' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateAppearance('card_style', opt.id)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${config.appearance.card_style === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Estilo de botones">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'rounded', label: 'Redondeado', cls: 'rounded-xl' },
                    { id: 'pill', label: 'Píldora', cls: 'rounded-full' },
                    { id: 'square', label: 'Cuadrado', cls: 'rounded-lg' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateAppearance('button_style', opt.id)}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${config.appearance.button_style === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <span className={`px-3 py-1 bg-blue-500 text-white text-[10px] font-semibold ${opt.cls}`}>Botón</span>
                      <span className="text-[10px] font-semibold text-gray-600">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Layout del menú">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'list', label: 'Lista', icon: '☰' },
                    { id: 'grid', label: 'Cuadrícula', icon: '⊞' },
                    { id: 'compact', label: 'Compacto', icon: '≡' },
                  ] as const).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateAppearance('menu_layout', opt.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${config.appearance.menu_layout === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-[10px] font-semibold text-gray-600">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </Block>

              <Block title="Efectos">
                <Toggle label="Animaciones" description="Transiciones suaves al cargar y al hacer scroll" checked={config.appearance.animations} onChange={v => updateAppearance('animations', v)} />
              </Block>
            </div>
          )}

          {/* ── Social panel ── */}
          {panel === 'social' && (
            <div className="p-4">
              <Block title="Redes sociales">
                <div className="space-y-3">
                  {([
                    { key: 'instagram', label: 'Instagram', icon: '📸', ph: 'https://instagram.com/turestaurante' },
                    { key: 'facebook', label: 'Facebook', icon: '👤', ph: 'https://facebook.com/turestaurante' },
                    { key: 'whatsapp', label: 'WhatsApp', icon: '💬', ph: 'https://wa.me/573001234567' },
                    { key: 'tiktok', label: 'TikTok', icon: '🎵', ph: 'https://tiktok.com/@turestaurante' },
                    { key: 'twitter', label: 'X / Twitter', icon: '𝕏', ph: 'https://x.com/turestaurante' },
                    { key: 'google_maps', label: 'Google Maps', icon: '📍', ph: 'https://maps.google.com/...' },
                    { key: 'website', label: 'Sitio web', icon: '🌐', ph: 'https://turestaurante.com' },
                  ] as const).map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="text-lg w-7 text-center flex-shrink-0">{s.icon}</span>
                      <input
                        value={(config.social as any)[s.key] ?? ''}
                        onChange={e => updateSocial(s.key, e.target.value)}
                        placeholder={s.ph}
                        className="flex-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </Block>
            </div>
          )}

          {/* ── Advanced panel ── */}
          {panel === 'advanced' && (
            <div className="p-4 space-y-5">
              <Block title="Footer">
                <div className="space-y-3">
                  <Toggle label='Mostrar "Powered by EccoFood"' checked={config.footer.show_powered_by} onChange={v => updateFooter('show_powered_by', v)} />
                  <Field
                    label="Texto personalizado"
                    value={config.footer.custom_text}
                    onChange={v => updateFooter('custom_text', v)}
                    placeholder="© 2026 Mi Restaurante"
                  />
                </div>
              </Block>

              <Block title="Restablecer">
                <p className="text-sm text-gray-500 mb-3">Vuelve a la configuración predeterminada de fábrica</p>
                <button
                  onClick={() => {
                    if (confirm('¿Restablecer configuración? Se perderán todos los cambios.')) {
                      setConfig(DEFAULT_PAGE_CONFIG)
                      toast.success('Configuración restablecida')
                    }
                  }}
                  className="w-full py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  Restablecer todo
                </button>
              </Block>
            </div>
          )}
        </div>

        {/* Footer save button */}
        <div className="p-3 border-t flex-shrink-0 bg-white">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : 'Guardar cambios'}
          </button>
        </div>
      </aside>

      {/* ── Right panel: preview placeholder ────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-100">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🖥️</div>
          <h3 className="font-semibold text-gray-900 mb-1">Vista previa de la tienda</h3>
          <p className="text-sm text-gray-400 mb-5">Guarda los cambios y ábrela para ver el resultado en tiempo real</p>
          <Link
            href={`/${tenantId}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Abrir tienda
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
          </Link>
        </div>

        <div className="text-xs text-gray-400 text-center px-4">
          Selecciona una sección en el panel izquierdo para configurarla
        </div>
      </div>

    </div>
  )
}

// ─── Shared UI components ──────────────────────────────────────────────────────

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-3 pt-3 pb-1 ${className}`}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{children}</p>
    </div>
  )
}

function NavRow({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <span className="text-base w-7 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-300 group-hover:text-gray-400 flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
    </button>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">{title}</p>
      {children}
    </div>
  )
}

function StyleBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-semibold text-gray-600">{label}</span>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      />
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 flex-shrink-0"
      />
      <div>
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        <p className="text-[10px] text-gray-400 font-mono">{value}</p>
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${checked ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'}`}
      >
        <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
      </button>
    </label>
  )
}
