'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import { uploadTenantMedia } from '@/lib/upload-client'
import { DEFAULT_PAGE_CONFIG, getPageConfig, type PageConfig } from '@/lib/pageConfig'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props { params: Promise<{ domain: string }> }

interface Banner {
  id: string
  title: string
  image_url: string
  link_url: string | null
  sort_order: number
  active: boolean
  placement?: BannerPlacement | null
}

interface MenuOption { id: string; name: string }
type TargetType = 'none' | 'product' | 'category' | 'url'
type PanelTab = 'store' | 'kiosk'
type BannerPlacement = 'top' | 'bottom' | 'both'

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)
}

function BannerPreview({ src, title, className }: { src: string; title?: string; className: string }) {
  if (isVideoMedia(src)) {
    return <video src={src} muted playsInline loop className={className} aria-label={title || 'Video banner'} />
  }

  return <img src={src} alt={title || 'preview'} className={className} />
}

export default function BannersPage({ params }: Props) {
  const { domain: slug } = use(params)
  const { tenantId, loading: resolvingTenant } = useTenantResolver(slug)
  const [tab, setTab] = useState<PanelTab>('store')
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)
  const [savingStore, setSavingStore] = useState(false)
  const [banners, setBanners] = useState<Banner[]>([])
  const [products, setProducts] = useState<MenuOption[]>([])
  const [categories, setCategories] = useState<MenuOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', sort_order: '0', placement: 'both' as BannerPlacement })
  const [targetType, setTargetType] = useState<TargetType>('none')
  const [targetId, setTargetId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!tenantId) return
    loadData()
  }, [tenantId])

  async function loadData() {
    setLoading(true)
    const [pageConfigRes, bannerRes, productRes, categoryRes] = await Promise.all([
      fetch(`/api/tenant/page-config?tenantId=${encodeURIComponent(slug)}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      supabase.from('kiosko_banners').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('id, name').eq('tenant_id', tenantId).eq('available', true).order('name'),
      supabase.from('menu_categories').select('id, name').eq('tenant_id', tenantId).order('sort_order'),
    ])

    setPageConfig(getPageConfig(pageConfigRes.page_config))
    setBanners(bannerRes.data || [])
    setProducts(productRes.data || [])
    setCategories(categoryRes.data || [])
    setLoading(false)
  }

  const updateStoreBanner = (updates: Partial<PageConfig['banner']>) => {
    setPageConfig(current => ({
      ...current,
      banner: { ...current.banner, ...updates },
      sections: current.sections.map(section =>
        section.type === 'banner'
          ? { ...section, enabled: updates.enabled ?? current.banner.enabled }
          : section
      ),
    }))
  }

  const saveStoreBanner = async () => {
    setSavingStore(true)
    try {
      const res = await fetch('/api/tenant/page-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId: slug, page_config: pageConfig }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      toast.success('Banner de tienda guardado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
    } finally {
      setSavingStore(false)
    }
  }

  const buildLinkUrl = () => {
    if (targetType === 'product' && targetId) return `product/${targetId}`
    if (targetType === 'category' && targetId) return `category/${targetId}`
    if (targetType === 'url') return form.link_url || null
    return null
  }

  const parseTarget = (link: string | null) => {
    if (!link) return { type: 'none' as TargetType, id: '', url: '' }
    const productId = link.match(/(?:product|producto|item)\/([^/?#]+)/i)?.[1] || link.match(/[?&](?:product|producto|item|menu_item_id)=([^&#]+)/i)?.[1]
    if (productId) return { type: 'product' as TargetType, id: productId, url: '' }
    const categoryId = link.match(/(?:category|categoria)\/([^/?#]+)/i)?.[1] || link.match(/[?&](?:category|categoria|category_id)=([^&#]+)/i)?.[1]
    if (categoryId) return { type: 'category' as TargetType, id: categoryId, url: '' }
    return { type: 'url' as TargetType, id: '', url: link }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadTenantMedia({ file, bucket: 'images', tenantId: tenantId || '' })
      setForm(f => ({ ...f, image_url: url }))
      setPreview(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setForm({ title: '', image_url: '', link_url: '', sort_order: '0', placement: 'both' })
    setTargetType('none')
    setTargetId('')
    setPreview('')
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId || !form.title.trim() || !form.image_url) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    try {
      const payload = {
        title: form.title.trim(),
        image_url: form.image_url,
        link_url: buildLinkUrl(),
        sort_order: parseInt(form.sort_order),
        placement: form.placement,
      }

      if (editingId) {
        await supabase.from('kiosko_banners').update(payload).eq('id', editingId)
        toast.success('Banner de kiosko actualizado')
      } else {
        await supabase.from('kiosko_banners').insert({ tenant_id: tenantId, ...payload, active: true })
        toast.success('Banner de kiosko creado')
      }

      resetForm()
      loadData()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleEdit = (banner: Banner) => {
    const parsed = parseTarget(banner.link_url)
    setTab('kiosk')
    setForm({
      title: banner.title,
      image_url: banner.image_url,
      link_url: parsed.url,
      sort_order: String(banner.sort_order),
      placement: banner.placement || 'both',
    })
    setTargetType(parsed.type)
    setTargetId(parsed.id)
    setPreview(banner.image_url)
    setEditingId(banner.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este banner del kiosko?')) return
    await supabase.from('kiosko_banners').delete().eq('id', id)
    toast.success('Banner eliminado')
    loadData()
  }

  if (resolvingTenant || loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/${slug}/admin/dashboard`} className="text-gray-500 hover:text-gray-700">Volver</Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banners</h1>
          <p className="mt-1 text-sm text-gray-500">Separa los anuncios de la tienda web y los videos del kiosko.</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab('store')}
          className={`rounded-xl border p-4 text-left transition ${tab === 'store' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-sm font-bold text-gray-900">Banner tienda web</p>
          <p className="mt-1 text-xs text-gray-500">Anuncio de texto para la pagina publica. No usa videos.</p>
        </button>
        <button
          type="button"
          onClick={() => setTab('kiosk')}
          className={`rounded-xl border p-4 text-left transition ${tab === 'kiosk' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
        >
          <p className="text-sm font-bold text-gray-900">Banners kiosko</p>
          <p className="mt-1 text-xs text-gray-500">Publicidad para pantalla tactil. Permite imagenes y videos.</p>
        </button>
      </div>

      {tab === 'store' ? (
        <section className="rounded-xl border bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Banner para pagina web / tienda</h2>
              <p className="mt-1 text-sm text-gray-500">Este banner aparece como anuncio dentro de la tienda publica.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={pageConfig.banner.enabled}
                onChange={e => updateStoreBanner({ enabled: e.target.checked })}
              />
              Mostrar banner
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700">Mensaje</span>
              <input
                value={pageConfig.banner.text}
                onChange={e => updateStoreBanner({ text: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Hoy 2x1 en hamburguesas"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Icono corto</span>
              <input
                value={pageConfig.banner.emoji}
                onChange={e => updateStoreBanner({ emoji: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Promo"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Link opcional</span>
              <input
                value={pageConfig.banner.link || ''}
                onChange={e => updateStoreBanner({ link: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Color de fondo</span>
              <input
                type="color"
                value={pageConfig.banner.bg_color}
                onChange={e => updateStoreBanner({ bg_color: e.target.value })}
                className="h-11 w-full rounded-lg border px-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Color de texto</span>
              <input
                type="color"
                value={pageConfig.banner.text_color}
                onChange={e => updateStoreBanner({ text_color: e.target.value })}
                className="h-11 w-full rounded-lg border px-2"
              />
            </label>
          </div>

          <div className="mt-5 rounded-xl border bg-gray-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase text-gray-400">Vista previa</p>
            <div
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold"
              style={{ backgroundColor: pageConfig.banner.bg_color, color: pageConfig.banner.text_color }}
            >
              {pageConfig.banner.emoji && <span>{pageConfig.banner.emoji}</span>}
              <span>{pageConfig.banner.text || 'Tu anuncio aparecera aqui'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={saveStoreBanner}
            disabled={savingStore}
            className="mt-5 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {savingStore ? 'Guardando...' : 'Guardar banner de tienda'}
          </button>
        </section>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mb-8 space-y-5 rounded-xl border bg-white p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar banner de kiosko' : 'Nuevo banner de kiosko'}</h2>
              <p className="mt-1 text-sm text-gray-500">Estos banners solo se muestran en el kiosko y pueden ser videos.</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Titulo *</span>
              <input
                type="text"
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Promocion especial"
              />
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Imagen o video *</label>
              {preview && (
                <div className="relative mb-3">
                  <BannerPreview src={preview} className="h-48 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, image_url: '' })); setPreview('') }}
                    className="absolute right-2 top-2 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                  >
                    Cambiar
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={uploading}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-400">Imagenes y videos cortos para modo reposo/publicidad del kiosko.</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Al tocar el banner</span>
              <select
                value={targetType}
                onChange={e => { setTargetType(e.target.value as TargetType); setTargetId(''); setForm(f => ({ ...f, link_url: '' })) }}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Solo mostrar publicidad</option>
                <option value="product">Abrir un producto</option>
                <option value="category">Abrir una categoria</option>
                <option value="url">Abrir URL externa</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Donde se muestra</span>
              <select
                value={form.placement}
                onChange={e => setForm(f => ({ ...f, placement: e.target.value as BannerPlacement }))}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top">Banner de arriba</option>
                <option value="bottom">Banner de abajo</option>
                <option value="both">Arriba y abajo</option>
              </select>
            </label>

            {targetType === 'product' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Producto</span>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar producto</option>
                  {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </label>
            )}

            {targetType === 'category' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Categoria</span>
                <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar categoria</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            )}

            {targetType === 'url' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">URL de enlace</span>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Orden</span>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {uploading ? 'Subiendo...' : editingId ? 'Actualizar banner' : 'Crear banner'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-lg border px-6 py-2.5 text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Banners de kiosko ({banners.length})</h2>
            {banners.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500">
                No hay banners de kiosko aun. Crea el primero.
              </div>
            ) : (
              banners.map(banner => (
                <div key={banner.id} className="flex items-start gap-4 rounded-lg border bg-white p-4">
                  <BannerPreview src={banner.image_url} title={banner.title} className="h-24 w-24 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{banner.title}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {isVideoMedia(banner.image_url) ? 'Video kiosko' : 'Imagen kiosko'} · {
                        banner.placement === 'top'
                          ? 'Arriba'
                          : banner.placement === 'bottom'
                            ? 'Abajo'
                            : 'Arriba y abajo'
                      }
                    </p>
                    {banner.link_url && <p className="truncate text-xs text-blue-600">{banner.link_url}</p>}
                    <p className="mt-1 text-xs text-gray-500">Orden: {banner.sort_order}</p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => handleEdit(banner)} className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-600 hover:bg-blue-200">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="rounded bg-red-100 px-3 py-1 text-sm text-red-600 hover:bg-red-200">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
