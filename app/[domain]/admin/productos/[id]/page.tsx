'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface EditProductoProps {
  params: Promise<{ domain: string; id: string }>
}

export default function EditProductoPage({ params }: EditProductoProps) {
  const { domain: tenantId, id } = use(params)
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    available: true,
    featured: false,
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('menu_categories').select('id, name').eq('tenant_id', tenantId),
      supabase.from('menu_items').select('*').eq('id', id).eq('tenant_id', tenantId).single(),
    ]).then(([categoriesRes, itemRes]) => {
      setCategories(categoriesRes.data || [])
      if (!itemRes.data) {
        setNotFound(true)
      } else {
        const item = itemRes.data
        setForm({
          name: item.name,
          description: item.description || '',
          price: String(item.price),
          category_id: item.category_id || '',
          image_url: item.image_url || '',
          available: item.available,
          featured: item.featured,
        })
      }
      setLoading(false)
    })
  }, [tenantId, id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'product-images')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, image_url: data.url }))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('menu_items').update({
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      available: form.available,
      featured: form.featured,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('tenant_id', tenantId)
    setSaving(false)
    if (!error) router.push(`/${tenantId}/admin/productos`)
  }

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar este producto?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('menu_items').delete().eq('id', id).eq('tenant_id', tenantId)
    router.push(`/${tenantId}/admin/productos`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Producto no encontrado</p>
        <Link href={`/${tenantId}/admin/productos`} className="text-blue-600 hover:underline">Volver a productos</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/${tenantId}/admin/productos`} className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="text-2xl font-bold text-gray-900">Editar Producto</h1>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Eliminando...' : '🗑️ Eliminar'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {/* Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
          <div className="flex gap-4 items-start">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="w-24 h-24 rounded-lg object-cover border" />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-3xl border">🍽️</div>
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="img-upload" />
              <label
                htmlFor="img-upload"
                className="px-4 py-2 border rounded-lg text-sm cursor-pointer hover:bg-gray-50 block text-center"
              >
                {uploadingImage ? 'Subiendo...' : 'Cambiar imagen'}
              </label>
              {form.image_url && (
                <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-xs text-red-500 mt-1 block">
                  Eliminar imagen
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Pizza Margherita"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Descripción del producto..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400">$</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.available}
              onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Disponible</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Destacado</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href={`/${tenantId}/admin/productos`} className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
