'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface NuevoProductoProps {
  params: Promise<{ domain: string }>
}

async function getTenantIdFromSlugClient(slug: string) {
  const supabase = createClient()
  const { data } = await supabase.from('tenants').select('id').eq('slug', slug).single()
  return data?.id || null
}

export default function NuevoProductoPage({ params }: NuevoProductoProps) {
  const { domain: slug } = use(params)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
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
    const initializeTenantId = async () => {
      const resolvedTenantId = await getTenantIdFromSlugClient(slug)
      setTenantId(resolvedTenantId)
    }
    initializeTenantId()
  }, [slug])

  useEffect(() => {
    if (!tenantId) return
    const supabase = createClient()
    supabase.from('menu_categories').select('id, name').eq('tenant_id', tenantId).then(({ data }) => {
      setCategories(data || [])
    })
  }, [tenantId])

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
    if (!tenantId) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('menu_items').insert({
      tenant_id: tenantId,
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      available: form.available,
      featured: form.featured,
    })

    setLoading(false)
    if (!error) router.push(`/${tenantId}/admin/productos`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${tenantId}/admin/productos`} className="text-gray-500 hover:text-gray-700">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
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
                {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
              </label>
              {form.image_url && (
                <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-xs text-red-500 mt-1 block">
                  Eliminar
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
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Guardando...' : 'Guardar Producto'}
          </button>
          <Link href={`/${tenantId}/admin/productos`} className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
