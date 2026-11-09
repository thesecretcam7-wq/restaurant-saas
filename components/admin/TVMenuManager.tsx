'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, ImagePlus, Monitor, Pencil, Plus, Trash2, X } from 'lucide-react'

interface TVMenuItem {
  id: string
  name: string
  description: string | null
  price: number | string
  category: string
  image_url: string | null
  badge: string | null
  active: boolean
  featured: boolean
  sort_order: number
}

function emptyForm() {
  return {
    id: '',
    name: '',
    description: '',
    price: '',
    category: 'Menu del dia',
    imageUrl: '',
    badge: '',
    active: true,
    featured: false,
    sortOrder: '0',
  }
}

export function TVMenuManager({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [items, setItems] = useState<TVMenuItem[]>([])
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void fetchItems()
  }, [tenantId])

  async function fetchItems() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/tv-menu?tenantId=${tenantId}`, { credentials: 'include' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el menu TV')
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar')
    } finally {
      setLoading(false)
    }
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('tenantId', tenantId)
      body.append('bucket', 'product-images')
      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo subir la foto')
      setForm((current) => ({ ...current, imageUrl: data.url || '' }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la foto')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.imageUrl) {
      setError('Sube una imagen para mostrar en el televisor')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/tv-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, ...form }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar')
      setForm(emptyForm())
      setShowForm(false)
      await fetchItems()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Borrar esta imagen del televisor?')) return
    setError('')
    try {
      const response = await fetch(`/api/tv-menu?tenantId=${tenantId}&id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo borrar')
      await fetchItems()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo borrar')
    }
  }

  function editItem(item: TVMenuItem) {
    setForm({
      id: item.id,
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? '').replace('.', ','),
      category: item.category || 'Menu del dia',
      imageUrl: item.image_url || '',
      badge: item.badge || '',
      active: item.active,
      featured: item.featured,
      sortOrder: String(item.sort_order || 0),
    })
    setShowForm(true)
  }

  const activeCount = useMemo(() => items.filter((item) => item.active && item.image_url?.trim()).length, [items])

  if (loading) return <div className="admin-empty">Cargando menu TV...</div>

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <div className="admin-card rounded-lg border p-5">
          <p className="text-xs font-black uppercase text-black/45">Imágenes TV</p>
          <p className="mt-2 text-2xl font-black text-[#15130f]">{items.length}</p>
        </div>
        <div className="admin-card rounded-lg border p-5">
          <p className="text-xs font-black uppercase text-black/45">Activos en pantalla</p>
          <p className="mt-2 text-2xl font-black text-[#15130f]">{activeCount}</p>
        </div>
        <div className="grid gap-2">
          <a href={`/${tenantSlug}/menu-tv`} target="_blank" rel="noopener noreferrer" className="admin-button-ghost min-h-12 justify-center">
            <Eye className="size-5" />
            Ver en TV
          </a>
          <button type="button" onClick={() => { setForm(emptyForm()); setShowForm(true) }} className="admin-button-primary min-h-12 justify-center">
            <Plus className="size-5" />
            Nueva imagen
          </button>
        </div>
      </div>

      <div className="admin-panel overflow-hidden">
        {items.length === 0 ? (
          <div className="admin-empty m-5">
            <Monitor className="mb-3 size-9 text-black/30" />
            <p className="font-black">Todavía no hay imágenes para el televisor</p>
            <p className="mt-1 text-sm">Sube tus carteles de publicidad. Se verán completos, sin divisiones.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
                <div className="relative aspect-video bg-black">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-5xl font-black text-white/24">TV</div>
                  )}
                  {!item.active && <div className="absolute bottom-3 right-3 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">Oculto</div>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-[#15130f]">{item.name}</p>
                      <p className="mt-1 text-sm font-semibold text-black/55">Orden: {item.sort_order}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => editItem(item)} className="admin-button-ghost min-h-10 flex-1">
                      <Pencil className="size-4" />
                      Editar
                    </button>
                    <button type="button" onClick={() => void deleteItem(item.id)} aria-label={`Eliminar ${item.name}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 font-black text-red-700">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full items-start justify-center overflow-y-auto bg-black/60 p-4 pt-20 backdrop-blur-sm md:left-64 md:w-[calc(100%-16rem)] md:pt-4">
          <form onSubmit={saveItem} className="admin-panel my-4 w-full max-w-3xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-black/10 px-5 py-4">
              <div>
                <p className="admin-eyebrow">Menu TV</p>
                <h2 className="text-2xl font-black text-[#15130f]">{form.id ? 'Editar imagen' : 'Nueva imagen'}</h2>
              </div>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario" className="rounded-lg p-2 text-black/45 hover:bg-black/5">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-black/[0.03]">
                  <div className="aspect-video bg-black">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="Vista previa de la imagen" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/35">
                        <ImagePlus className="size-12" />
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="admin-button-ghost m-3 min-h-11 w-[calc(100%-1.5rem)]">
                    <ImagePlus className="size-4" />
                    {uploading ? 'Subiendo...' : 'Subir foto'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
                </div>
                <p className="mt-3 text-sm text-black/55">Se muestra la imagen entera, sin recortar ni deformar. Para llenar un televisor horizontal, usa un cartel de 1920 × 1080 píxeles (16:9).</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="tv-image-name" className="mb-2 block text-xs font-black uppercase text-black/45">Título *</label>
                  <input id="tv-image-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="admin-input" placeholder="Ej. Oferta de desayunos" />
                  <p className="mt-2 text-xs text-black/55">El título sirve para identificar la imagen aquí; en el televisor solo se verá el cartel y la hora.</p>
                </div>
                <div>
                  <label htmlFor="tv-image-order" className="mb-2 block text-xs font-black uppercase text-black/45">Orden de las imágenes</label>
                  <input id="tv-image-order" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="admin-input" inputMode="numeric" />
                </div>
                <div>
                  <label className="flex items-center gap-3 rounded-lg border border-black/10 p-3 text-sm font-black text-[#15130f]">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    Mostrar en TV
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-black/10 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="admin-button-ghost sm:w-auto">Cancelar</button>
              <button type="submit" disabled={saving || uploading} className="admin-button-primary sm:w-auto disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar imagen'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
