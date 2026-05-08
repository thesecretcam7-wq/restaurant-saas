'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Megaphone,
  Palette,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
} from 'lucide-react'
import {
  DEFAULT_PAGE_CONFIG,
  getPageConfig,
  type PageConfig,
  type TestimonialItem,
} from '@/lib/pageConfig'

type TabId = 'home' | 'hero' | 'sections' | 'style' | 'social' | 'advanced'

interface BrandFallbacks {
  appName: string
  tagline: string
  description: string
  heroImageUrl: string
  instagram: string
  facebook: string
  whatsapp: string
  website: string
}

const tabs: Array<{ id: TabId; label: string; helper: string; Icon: typeof LayoutTemplate }> = [
  { id: 'home', label: 'Resumen', helper: 'Estado de la tienda', Icon: LayoutTemplate },
  { id: 'hero', label: 'Portada', helper: 'Primera pantalla', Icon: ImagePlus },
  { id: 'sections', label: 'Secciones', helper: 'Orden y contenido', Icon: Megaphone },
  { id: 'style', label: 'Estilo', helper: 'Tarjetas y menu', Icon: Palette },
  { id: 'social', label: 'Redes', helper: 'Links publicos', Icon: Share2 },
  { id: 'advanced', label: 'Avanzado', helper: 'Footer y reset', Icon: Sparkles },
]

const sectionCopy: Record<string, { label: string; description: string }> = {
  banner: { label: 'Promocion superior', description: 'Mensaje corto arriba de la tienda, ideal para ofertas.' },
  featured: { label: 'Productos destacados', description: 'Platos que quieres mostrar primero.' },
  about: { label: 'Sobre el restaurante', description: 'Historia, concepto o descripcion de la marca.' },
  info: { label: 'Datos del negocio', description: 'Direccion, telefono y detalles de contacto.' },
  gallery: { label: 'Fotos', description: 'Imagenes del local, platos o ambiente.' },
  hours: { label: 'Horarios', description: 'Dias y horas de atencion.' },
  testimonials: { label: 'Opiniones', description: 'Comentarios de clientes para generar confianza.' },
  actions: { label: 'Botones rapidos', description: 'Accesos como ver menu, reservar o contactar.' },
  social: { label: 'Redes sociales', description: 'Links a Instagram, WhatsApp, Facebook y mas.' },
}

function sectionInfo(type: string) {
  return sectionCopy[type] || { label: 'Seccion', description: 'Bloque visible en la tienda.' }
}

export default function PageBuilderPage() {
  const params = useParams()
  const tenantSlug = params.domain as string
  const { tenantId } = useTenantResolver(tenantSlug)
  const [config, setConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [brandFallbacks, setBrandFallbacks] = useState<BrandFallbacks>({
    appName: '',
    tagline: '',
    description: '',
    heroImageUrl: '',
    instagram: '',
    facebook: '',
    whatsapp: '',
    website: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'pending' | 'saving' | 'error'>('idle')
  const [tab, setTab] = useState<TabId>('home')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('featured')
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/tenant/page-config?tenantId=${tenantSlug}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setConfig(getPageConfig(data.page_config))
        setDirty(false)
        setSaveStatus('idle')
      })
      .catch(() => {
        setSaveStatus('error')
        toast.error('No se pudo cargar el diseño')
      })
      .finally(() => setLoading(false))
  }, [tenantSlug])

  useEffect(() => {
    if (!tenantId) return

    fetch(`/api/tenant/branding?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        const branding = data.branding || {}
        const fallbacks = {
          appName: branding.app_name || '',
          tagline: branding.tagline || '',
          description: branding.description || '',
          heroImageUrl: branding.hero_image_url || '',
          instagram: branding.instagram_url || '',
          facebook: branding.facebook_url || '',
          whatsapp: branding.whatsapp_number ? `https://wa.me/${String(branding.whatsapp_number).replace(/\D/g, '')}` : '',
          website: branding.website_url || '',
        }
        setBrandFallbacks(fallbacks)
        setConfig(current => ({
          ...current,
          hero: {
            ...current.hero,
            title_text: current.hero.title_text || fallbacks.appName,
            subtitle_text: current.hero.subtitle_text || fallbacks.tagline,
          },
          about: {
            ...current.about,
            text: current.about.text || fallbacks.description,
          },
          social: {
            ...current.social,
            instagram: current.social.instagram || fallbacks.instagram,
            facebook: current.social.facebook || fallbacks.facebook,
            whatsapp: current.social.whatsapp || fallbacks.whatsapp,
            website: current.social.website || fallbacks.website,
          },
        }))
      })
      .catch(() => {})
  }, [tenantId])

  const sortedSections = useMemo(
    () => [...config.sections].sort((a, b) => a.order - b.order),
    [config.sections]
  )
  const selectedSection = config.sections.find(s => s.id === selectedSectionId) || sortedSections[0]
  const activeSections = config.sections.filter(s => s.enabled).length
  const publicBaseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
  const storeUrl = `https://${tenantSlug}.${publicBaseDomain}`

  const markDirty = () => {
    setDirty(true)
    setSaveStatus('pending')
  }

  const save = async (mode: 'manual' | 'auto' = 'manual') => {
    setSaving(true)
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/tenant/page-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId: tenantSlug, page_config: config }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setDirty(false)
      setSaveStatus('saved')
      if (mode === 'manual') toast.success('Diseño guardado')
    } catch {
      setSaveStatus('error')
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!dirty) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => save('auto'), 1400)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [config, dirty])

  const uploadImage = async (file: File, key: string): Promise<string | null> => {
    setUploadingImage(key)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      return data.url || null
    } catch {
      toast.error('No se pudo subir la imagen')
      return null
    } finally {
      setUploadingImage(null)
    }
  }

  const updateHero = (key: string, value: any) => {
    setConfig(c => ({ ...c, hero: { ...c.hero, [key]: value } }))
    markDirty()
  }

  const updateAppearance = (key: string, value: any) => {
    setConfig(c => ({ ...c, appearance: { ...c.appearance, [key]: value } }))
    markDirty()
  }

  const updateSocial = (key: string, value: string) => {
    setConfig(c => ({ ...c, social: { ...c.social, [key]: value } }))
    markDirty()
  }

  const updateBanner = (key: string, value: any) => {
    setConfig(c => ({ ...c, banner: { ...c.banner, [key]: value } }))
    markDirty()
  }

  const updateAbout = (key: string, value: any) => {
    setConfig(c => ({ ...c, about: { ...c.about, [key]: value } }))
    markDirty()
  }

  const updateFooter = (key: string, value: any) => {
    setConfig(c => ({ ...c, footer: { ...c.footer, [key]: value } }))
    markDirty()
  }

  const updateSectionConfig = (id: string, key: string, value: any) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s),
    }))
    markDirty()
  }

  const toggleSection = (id: string) => {
    setConfig(c => {
      const next = {
        ...c,
        sections: c.sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s),
      }
      if (id === 'banner') next.banner = { ...next.banner, enabled: !next.banner.enabled }
      return next
    })
    markDirty()
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setConfig(c => {
      const sections = [...c.sections].sort((a, b) => a.order - b.order)
      const idx = sections.findIndex(s => s.id === id)
      if (direction === 'up' && idx > 0) {
        const order = sections[idx].order
        sections[idx].order = sections[idx - 1].order
        sections[idx - 1].order = order
      }
      if (direction === 'down' && idx < sections.length - 1) {
        const order = sections[idx].order
        sections[idx].order = sections[idx + 1].order
        sections[idx + 1].order = order
      }
      return { ...c, sections }
    })
    markDirty()
  }

  const addGalleryImage = async (file: File) => {
    const url = await uploadImage(file, 'gallery')
    if (url) {
      setConfig(c => ({ ...c, gallery: { ...c.gallery, images: [...c.gallery.images, url] } }))
      markDirty()
    }
  }

  const removeGalleryImage = (index: number) => {
    setConfig(c => ({ ...c, gallery: { ...c.gallery, images: c.gallery.images.filter((_, i) => i !== index) } }))
    markDirty()
  }

  const addTestimonial = () => {
    setConfig(c => ({ ...c, testimonials: [...c.testimonials, { name: '', text: '', rating: 5 }] }))
    markDirty()
  }

  const updateTestimonial = (index: number, field: keyof TestimonialItem, value: any) => {
    setConfig(c => ({
      ...c,
      testimonials: c.testimonials.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }))
    markDirty()
  }

  const removeTestimonial = (index: number) => {
    setConfig(c => ({ ...c, testimonials: c.testimonials.filter((_, i) => i !== index) }))
    markDirty()
  }

  if (loading) {
    return (
      <div className="admin-panel flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-[#e43d30]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Tienda pública</p>
          <h1 className="admin-title">Diseño de tienda</h1>
          <p className="admin-subtitle">Edita la portada, el orden de secciones y los detalles visibles para tus clientes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={storeUrl} target="_blank" rel="noopener noreferrer" className="admin-button-secondary">
            <ExternalLink className="size-4" />
            Ver tienda
          </Link>
        </div>
      </div>

      <div className={`flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between ${
        saveStatus === 'error'
          ? 'border-red-200 bg-red-50/95 text-red-800'
          : saveStatus === 'saved'
            ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
            : saveStatus === 'idle'
              ? 'border-slate-200 bg-white text-slate-800'
            : 'border-amber-200 bg-amber-50/95 text-amber-900'
      }`}>
        <div>
          <p className="text-sm font-black">
            {saveStatus === 'saving'
              ? 'Guardando cambios...'
              : saveStatus === 'pending'
                ? 'Cambios pendientes'
                : saveStatus === 'error'
                  ? 'No se pudo guardar'
                  : saveStatus === 'saved'
                    ? 'Cambios guardados'
                    : 'Diseño cargado'}
          </p>
          <p className="text-sm font-bold opacity-90">
            {saveStatus === 'pending'
              ? 'Se guardarán automáticamente en un momento.'
              : saveStatus === 'saved'
                ? 'El diseño está sincronizado con la tienda.'
                : saveStatus === 'saving'
                  ? 'Estamos actualizando la tienda.'
                  : saveStatus === 'error'
                    ? 'Revisa la conexión e intenta guardar de nuevo.'
                    : 'No hay cambios pendientes por guardar.'}
          </p>
        </div>
        <button onClick={() => save('manual')} disabled={saving || (!dirty && (saveStatus === 'saved' || saveStatus === 'idle'))} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#15130f] px-4 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-45">
          <Save className="size-4" />
          Guardar ahora
        </button>
      </div>

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="admin-panel min-w-0 overflow-hidden p-2 2xl:col-span-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(({ id, label, helper, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex min-w-[178px] flex-shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition 2xl:min-w-0 2xl:flex-1 ${
                  tab === id ? 'bg-[#15130f] text-white' : 'text-black/75 hover:bg-white hover:text-[#15130f]'
                }`}
              >
                <span className={`flex size-10 flex-shrink-0 items-center justify-center rounded-lg ${tab === id ? 'bg-white/12' : 'bg-black/5 text-[#e43d30]'}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{label}</span>
                  <span className={`block truncate text-xs font-bold ${tab === id ? 'text-white/75' : 'text-black/58'}`}>{helper}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {tab === 'home' && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard label="Secciones activas" value={`${activeSections}/${config.sections.length}`} />
                <StatCard label="Portada" value={config.hero.image_url ? 'Con imagen' : 'Sin imagen'} />
                <StatCard label="Menu" value={labelFor(config.appearance.menu_layout, menuLayoutOptions)} />
              </div>
              <Panel title="¿Qué quieres cambiar?" desc="Elige una acción rápida. Todo queda guardado solo cuando presionas Guardar.">
                <div className="grid gap-3 md:grid-cols-2">
                  <QuickButton title="Cambiar foto principal" desc="Imagen grande de entrada" onClick={() => setTab('hero')} />
                  <QuickButton title="Ordenar secciones" desc="Mostrar u ocultar bloques" onClick={() => setTab('sections')} />
                  <QuickButton title="Cambiar estilo" desc="Tarjetas, botones y menu" onClick={() => setTab('style')} />
                  <QuickButton title="Conectar redes" desc="Instagram, WhatsApp y links" onClick={() => setTab('social')} />
                </div>
              </Panel>
            </>
          )}

          {tab === 'hero' && (
            <Panel title="Portada de la tienda" desc="Esta es la primera impresion del cliente. Usa una foto clara del restaurante o de tus platos.">
              <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4">
                  <Field label="Titulo principal" value={config.hero.title_text} placeholder={brandFallbacks.appName || 'Nombre del restaurante'} onChange={v => updateHero('title_text', v)} />
                  <Field label="Subtitulo" value={config.hero.subtitle_text} placeholder={brandFallbacks.tagline || 'Slogan del branding'} onChange={v => updateHero('subtitle_text', v)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Boton principal" value={config.hero.cta_primary_text} onChange={v => updateHero('cta_primary_text', v)} />
                    <Field label="Boton secundario" value={config.hero.cta_secondary_text} onChange={v => updateHero('cta_secondary_text', v)} />
                  </div>
                  <ChoiceGrid
                    label="Tamano"
                    value={config.hero.height}
                    options={[
                      { id: 'small', label: 'Compacta' },
                      { id: 'medium', label: 'Normal' },
                      { id: 'large', label: 'Grande' },
                    ]}
                    onChange={v => updateHero('height', v)}
                  />
                  <RangeField label="Oscurecer foto" value={config.hero.overlay_opacity} min={0} max={85} onChange={v => updateHero('overlay_opacity', v)} />
                  <Toggle label="Mostrar logo en portada" checked={config.hero.show_logo} onChange={v => updateHero('show_logo', v)} />
                  <Toggle label="Mostrar datos rapidos" description="Delivery, ubicacion y pagos." checked={config.hero.show_info_pills} onChange={v => updateHero('show_info_pills', v)} />
                </div>
                <ImageUploader
                  label="Foto principal"
              imageUrl={config.hero.image_url || brandFallbacks.heroImageUrl}
                  loading={uploadingImage === 'hero'}
                  onFile={async file => {
                    const url = await uploadImage(file, 'hero')
                    if (url) updateHero('image_url', url)
                  }}
                />
              </div>
            </Panel>
          )}

          {tab === 'sections' && (
            <div className="grid min-w-0 gap-5">
              <Panel title="Secciones de la tienda" desc="Activa solo lo que el restaurante necesita y organiza el orden.">
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="text-sm font-black">Como funciona</p>
                  <p className="mt-1 text-sm font-bold leading-6">Cada fila es un bloque de la tienda. Usa las flechas para moverlo y el interruptor rojo para mostrarlo u ocultarlo.</p>
                </div>
                <div className="space-y-2">
                  {sortedSections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition lg:flex-row lg:items-center ${
                        selectedSectionId === section.id ? 'border-[#e43d30] bg-red-50/70' : 'border-black/8 bg-white hover:border-black/18'
                      }`}
                    >
                      <span className="flex w-full items-center gap-3 lg:min-w-0 lg:flex-1">
                        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/5 text-sm font-black text-[#15130f]">{index + 1}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-[#15130f]">{sectionInfo(section.type).label}</span>
                          <span className="block truncate text-sm font-bold text-black/60">{sectionInfo(section.type).description}</span>
                        </span>
                      </span>
                      <span className="flex w-full items-center justify-between gap-2 border-t border-black/8 pt-3 lg:w-auto lg:flex-shrink-0 lg:justify-end lg:border-t-0 lg:pt-0">
                        <IconButton label="Subir" disabled={index === 0} onClick={e => { e.stopPropagation(); moveSection(section.id, 'up') }}>
                          <ArrowUp className="size-3.5" />
                        </IconButton>
                        <IconButton label="Bajar" disabled={index === sortedSections.length - 1} onClick={e => { e.stopPropagation(); moveSection(section.id, 'down') }}>
                          <ArrowDown className="size-3.5" />
                        </IconButton>
                        <Switch checked={section.enabled} onClick={e => { e.stopPropagation(); toggleSection(section.id) }} />
                      </span>
                    </button>
                  ))}
                </div>
              </Panel>

              {selectedSection && (
                <SectionEditor
                  section={selectedSection}
                  config={config}
                  uploadingImage={uploadingImage}
                  updateSectionConfig={updateSectionConfig}
                  updateBanner={updateBanner}
                  updateAbout={updateAbout}
                  addGalleryImage={addGalleryImage}
                  removeGalleryImage={removeGalleryImage}
                  addTestimonial={addTestimonial}
                  updateTestimonial={updateTestimonial}
                  removeTestimonial={removeTestimonial}
                  uploadImage={uploadImage}
                />
              )}
            </div>
          )}

          {tab === 'style' && (
            <Panel title="Estilo visual" desc="Controles simples para que la tienda se vea consistente. Los colores principales se editan en Branding.">
              <div className="space-y-5">
                <ChoiceGrid label="Esquinas" value={config.appearance.border_radius} options={radiusOptions} onChange={v => updateAppearance('border_radius', v)} />
                <ChoiceGrid label="Tarjetas" value={config.appearance.card_style} options={cardOptions} onChange={v => updateAppearance('card_style', v)} />
                <ChoiceGrid label="Botones" value={config.appearance.button_style} options={buttonOptions} onChange={v => updateAppearance('button_style', v)} />
                <ChoiceGrid label="Vista del menu" value={config.appearance.menu_layout} options={menuLayoutOptions} onChange={v => updateAppearance('menu_layout', v)} />
                <Toggle label="Animaciones suaves" checked={config.appearance.animations} onChange={v => updateAppearance('animations', v)} />
              </div>
            </Panel>
          )}

          {tab === 'social' && (
            <Panel title="Redes y enlaces" desc="Agrega los links que quieres mostrar en la tienda.">
              <div className="grid gap-3">
                {socialFields.map(field => (
                  <Field
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={(config.social as any)[field.key] || ''}
                    onChange={v => updateSocial(field.key, v)}
                  />
                ))}
              </div>
            </Panel>
          )}

          {tab === 'advanced' && (
            <Panel title="Avanzado" desc="Opciones menos frecuentes. Usalas con cuidado.">
              <div className="space-y-5">
                <Toggle label='Mostrar "Powered by Eccofood"' checked={config.footer.show_powered_by} onChange={v => updateFooter('show_powered_by', v)} />
                <Field label="Texto del footer" value={config.footer.custom_text} placeholder="Ej: 2026 El Buen Paladar" onChange={v => updateFooter('custom_text', v)} />
                <button
                  onClick={() => {
                    if (confirm('¿Restablecer el diseño de tienda? Se perderán los cambios no guardados.')) {
                      setConfig(DEFAULT_PAGE_CONFIG)
                      markDirty()
                      toast.success('Diseño restablecido')
                    }
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <RotateCcw className="size-4" />
                  Restablecer diseño
                </button>
              </div>
            </Panel>
          )}
        </main>

        <aside className="admin-panel h-fit min-w-0 p-5 2xl:sticky 2xl:top-5">
          <p className="text-sm font-black uppercase text-black/65">Vista rapida</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            <div
              className="flex h-40 items-end p-4 text-white"
              style={{
                backgroundImage: config.hero.image_url
                  ? `linear-gradient(rgba(0,0,0,${config.hero.overlay_opacity / 100}), rgba(0,0,0,${config.hero.overlay_opacity / 100})), url(${config.hero.image_url})`
                  : 'linear-gradient(135deg, #15130f, #e43d30)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div>
                <p className="text-lg font-black">{config.hero.title_text || brandFallbacks.appName || 'Nombre del restaurante'}</p>
                <p className="mt-1 text-sm font-bold text-white/86">{config.hero.subtitle_text || brandFallbacks.tagline || 'Slogan de la marca'}</p>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {sortedSections.filter(s => s.enabled).slice(0, 5).map(section => (
                <div key={section.id} className="flex items-center justify-between rounded-lg bg-black/[0.035] px-3 py-2">
                  <span className="text-sm font-black text-[#15130f]">{sectionInfo(section.type).label}</span>
                  <span className="size-2 rounded-full bg-[#e43d30]" />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-sm font-bold leading-6 text-black/62">Esta vista es una guia rapida. Para ver el resultado real, guarda y abre la tienda.</p>
        </aside>
      </div>
    </div>
  )
}

function SectionEditor(props: {
  section: PageConfig['sections'][number]
  config: PageConfig
  uploadingImage: string | null
  updateSectionConfig: (id: string, key: string, value: any) => void
  updateBanner: (key: string, value: any) => void
  updateAbout: (key: string, value: any) => void
  addGalleryImage: (file: File) => void
  removeGalleryImage: (index: number) => void
  addTestimonial: () => void
  updateTestimonial: (index: number, field: keyof TestimonialItem, value: any) => void
  removeTestimonial: (index: number) => void
  uploadImage: (file: File, key: string) => Promise<string | null>
}) {
  const { section, config } = props

  return (
    <Panel title={sectionInfo(section.type).label} desc={sectionInfo(section.type).description}>
      {section.type === 'banner' && (
        <div className="space-y-4">
          <Field label="Texto del anuncio" value={config.banner.text} placeholder="Ej: 20% de descuento hoy" onChange={v => props.updateBanner('text', v)} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Icono corto" value={config.banner.emoji} onChange={v => props.updateBanner('emoji', v)} />
            <ColorField label="Fondo" value={config.banner.bg_color} onChange={v => props.updateBanner('bg_color', v)} />
            <ColorField label="Texto" value={config.banner.text_color} onChange={v => props.updateBanner('text_color', v)} />
          </div>
        </div>
      )}

      {section.type === 'featured' && (
        <Field
          type="number"
          label="Cantidad de productos destacados"
          value={String(section.config.count ?? 8)}
          onChange={v => props.updateSectionConfig(section.id, 'count', Number(v))}
        />
      )}

      {section.type === 'about' && (
        <div className="space-y-4">
          <Field label="Titulo" value={config.about.title} onChange={v => props.updateAbout('title', v)} />
          <TextArea label="Historia del restaurante" value={config.about.text} onChange={v => props.updateAbout('text', v)} />
          <ImageUploader
            label="Foto de la seccion"
            imageUrl={config.about.image_url}
            loading={props.uploadingImage === 'about'}
            onFile={async file => {
              const url = await props.uploadImage(file, 'about')
              if (url) props.updateAbout('image_url', url)
            }}
          />
        </div>
      )}

      {section.type === 'gallery' && (
        <div className="space-y-4">
          <ChoiceGrid
            label="Presentacion"
            value={config.gallery.style}
            options={[
              { id: 'grid', label: 'Cuadricula' },
              { id: 'carousel', label: 'Carrusel' },
              { id: 'masonry', label: 'Mosaico' },
            ]}
            onChange={v => props.updateSectionConfig(section.id, 'style', v)}
          />
          <div className="grid grid-cols-3 gap-2">
            {config.gallery.images.map((image, index) => (
              <div key={image} className="group relative aspect-square overflow-hidden rounded-xl border border-black/10">
                <img src={image} alt="" className="h-full w-full object-cover" />
                <button onClick={() => props.removeGalleryImage(index)} className="absolute right-1 top-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white opacity-0 transition group-hover:opacity-100">x</button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/20 text-sm font-black text-black/65 transition hover:border-[#e43d30] hover:text-[#e43d30]">
              <ImagePlus className="mb-1 size-5" />
              Agregar
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (file) props.addGalleryImage(file)
              }} />
            </label>
          </div>
        </div>
      )}

      {section.type === 'testimonials' && (
        <div className="space-y-3">
          {config.testimonials.map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-black/10 bg-white p-3">
              <div className="flex gap-2">
                <input value={item.name} onChange={e => props.updateTestimonial(index, 'name', e.target.value)} placeholder="Nombre del cliente" className="h-10 flex-1 rounded-lg border border-black/10 px-3 text-sm font-semibold outline-none focus:border-[#e43d30]" />
                <button onClick={() => props.removeTestimonial(index)} className="rounded-lg border border-red-200 px-3 text-sm font-black text-red-600">x</button>
              </div>
              <TextArea label="Comentario" value={item.text} onChange={v => props.updateTestimonial(index, 'text', v)} />
              <ChoiceGrid
                label="Calificacion"
                value={String(item.rating)}
                options={[1, 2, 3, 4, 5].map(n => ({ id: String(n), label: `${n}` }))}
                onChange={v => props.updateTestimonial(index, 'rating', Number(v))}
              />
            </div>
          ))}
          <button onClick={props.addTestimonial} className="w-full rounded-xl border-2 border-dashed border-black/20 py-3 text-sm font-black text-black/70 transition hover:border-[#e43d30] hover:text-[#e43d30]">Agregar opinion</button>
        </div>
      )}

      {['info', 'hours', 'actions', 'social'].includes(section.type) && (
        <div className="rounded-xl border border-dashed border-black/15 bg-black/[0.025] p-4">
          <p className="text-sm font-black text-[#15130f]">Esta seccion usa datos ya configurados.</p>
          <p className="mt-1 text-sm font-bold leading-6 text-black/62">Puedes mostrarla, ocultarla u ordenarla. Sus datos salen de Restaurante, Horarios, Branding y Redes.</p>
        </div>
      )}
    </Panel>
  )
}

const radiusOptions = [
  { id: 'none', label: 'Rectas' },
  { id: 'small', label: 'Suaves' },
  { id: 'medium', label: 'Redondas' },
  { id: 'large', label: 'Premium' },
]

const cardOptions = [
  { id: 'flat', label: 'Plano' },
  { id: 'bordered', label: 'Borde' },
  { id: 'shadow', label: 'Sombra' },
  { id: 'glass', label: 'Cristal' },
]

const buttonOptions = [
  { id: 'rounded', label: 'Normal' },
  { id: 'pill', label: 'Pildora' },
  { id: 'square', label: 'Compacto' },
]

const menuLayoutOptions = [
  { id: 'list', label: 'Lista' },
  { id: 'grid', label: 'Cuadricula' },
  { id: 'compact', label: 'Compacto' },
]

const socialFields = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/turestaurante' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/turestaurante' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/573001234567' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@turestaurante' },
  { key: 'google_maps', label: 'Google Maps', placeholder: 'https://maps.google.com/...' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://turestaurante.com' },
]

function labelFor(value: string, options: Array<{ id: string; label: string }>) {
  return options.find(option => option.id === value)?.label || value
}

function Panel({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="admin-panel p-5">
      <div className="mb-5">
        <h2 className="text-lg font-black text-[#15130f]">{title}</h2>
        {desc && <p className="mt-1 text-sm font-bold leading-6 text-black/62">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="admin-card p-5">
      <p className="text-sm font-black uppercase text-black/62">{label}</p>
      <p className="mt-3 text-2xl font-black text-[#15130f]">{value}</p>
    </article>
  )
}

function QuickButton({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-black/10 bg-white p-4 text-left transition hover:border-[#e43d30]/40 hover:shadow-md">
      <p className="text-sm font-black text-[#15130f]">{title}</p>
      <p className="mt-1 text-sm font-bold text-black/58">{desc}</p>
    </button>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black uppercase text-black/65">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold text-[#15130f] outline-none transition focus:border-[#e43d30] focus:ring-4 focus:ring-red-500/10"
      />
    </label>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black uppercase text-black/65">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-[#15130f] outline-none transition focus:border-[#e43d30] focus:ring-4 focus:ring-red-500/10"
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-black uppercase text-black/65">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="text-sm font-black text-black/65">{value}</span>
      </span>
    </label>
  )
}

function ChoiceGrid({ label, value, options, onChange }: {
  label: string
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black uppercase text-black/65">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-black transition ${
              value === option.id ? 'border-[#e43d30] bg-red-50 text-[#15130f]' : 'border-black/12 bg-white text-black/72 hover:border-black/25'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-3">
      <div>
        <p className="text-sm font-black text-[#15130f]">{label}</p>
        {description && <p className="mt-0.5 text-sm font-bold text-black/58">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${checked ? 'justify-end bg-[#e43d30]' : 'justify-start bg-black/18'}`}
      >
        <span className="size-5 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  )
}

function Switch({ checked, onClick }: { checked: boolean; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${checked ? 'justify-end bg-[#e43d30]' : 'justify-start bg-black/18'}`}
      aria-label={checked ? 'Ocultar seccion' : 'Mostrar seccion'}
    >
      <span className="size-5 rounded-full bg-white shadow-sm" />
    </button>
  )
}

function RangeField({ label, value, min, max, onChange }: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black uppercase text-black/65">{label}</p>
        <p className="text-xs font-black text-[#15130f]">{value}%</p>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#e43d30]" />
    </div>
  )
}

function ImageUploader({ label, imageUrl, loading, onFile }: {
  label: string
  imageUrl?: string
  loading: boolean
  onFile: (file: File) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black uppercase text-black/65">{label}</p>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center bg-black/[0.045] text-black/55">
            <ImagePlus className="size-10" />
          </div>
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-black/10 px-4 py-3 text-sm font-black text-[#e43d30] transition hover:bg-red-50">
          <ImagePlus className="size-4" />
          {loading ? 'Subiendo...' : 'Subir imagen'}
          <input type="file" accept="image/*" className="hidden" onChange={e => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
          }} />
        </label>
      </div>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: {
  label: string
  disabled?: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-black/15 bg-white text-black/65 transition hover:text-[#15130f] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  )
}
