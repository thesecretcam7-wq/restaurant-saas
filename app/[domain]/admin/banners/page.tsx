'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
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
}

export default function BannersPage({ params }: Props) {
  const { domain: slug } = use(params)
  const { tenantId, loading: resolvingTenant } = useTenantResolver(slug)
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', sort_order: '0' })
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!tenantId) return
    loadBanners()
  }, [tenantId])

  async function loadBanners() {
    const { data: bannerData } = await supabase
      .from('kiosko_banners')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')

    setBanners(bannerData || [])
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(f => ({ ...f, image_url: data.url }))
      setPreview(data.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId || !form.title.trim() || !form.image_url) {
      toast.error('Completa todos los campos requeridos')
      return
    }

    try {
      if (editingId) {
        await supabase
          .from('kiosko_banners')
          .update({
            title: form.title,
            image_url: form.image_url,
            link_url: form.link_url || null,
            sort_order: parseInt(form.sort_order),
          })
          .eq('id', editingId)
        toast.success('Banner actualizado')
      } else {
        await supabase.from('kiosko_banners').insert({
          tenant_id: tenantId,
          title: form.title,
          image_url: form.image_url,
          link_url: form.link_url || null,
          sort_order: parseInt(form.sort_order),
          active: true,
        })
        toast.success('Banner creado')
      }

      setForm({ title: '', image_url: '', link_url: '', sort_order: '0' })
      setPreview('')
      setEditingId(null)
      loadBanners()
    } catch (err) {
      toast.error('Error al guardar')
    }
  }

  const handleEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url || '',
      sort_order: String(banner.sort_order),
    })
    setPreview(banner.image_url)
    setEditingId(banner.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return
    await supabase.from('kiosko_banners').delete().eq('id', id)
    toast.success('Banner eliminado')
    loadBanners()
  }

  const handleCancel = () => {
    setForm({ title: '', image_url: '', link_url: '', sort_order: '0' })
    setPreview('')
    setEditingId(null)
  }

  if (resolvingTenant || loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${slug}/admin/dashboard`} className="text-gray-500 hover:text-gray-700">←</Link>
        <h1 className="text-3xl font-bold text-gray-900">Banners del Kiosko</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 mb-8 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Banner' : 'Nuevo Banner'}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Promoción especial"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagen *</label>
          {preview && (
            <div className="mb-3 relative">
              <img src={preview} alt="preview" className="w-full h-48 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => { setForm(f => ({ ...f, image_url: '' })); setPreview('') }}
                className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
              >
                Cambiar
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (máx 5MB)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL de enlace (opcional)</label>
          <input
            type="url"
            value={form.link_url}
            onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
          <input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">0 = primera posición</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploading ? 'Subiendo...' : editingId ? 'Actualizar Banner' : 'Crear Banner'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Banners List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Banners ({banners.length})</h2>
        {banners.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
            No hay banners aún. Crea el primero.
          </div>
        ) : (
          banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-lg border p-4 flex gap-4 items-start">
              <img src={banner.image_url} alt={banner.title} className="w-24 h-24 object-cover rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{banner.title}</p>
                {banner.link_url && <p className="text-xs text-blue-600 truncate">{banner.link_url}</p>}
                <p className="text-xs text-gray-500 mt-1">Orden: {banner.sort_order}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(banner)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
