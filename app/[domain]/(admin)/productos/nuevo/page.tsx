'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Category {
  id: string
  name: string
}

export default function NewProductPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as string

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`/api/menu-categories?domain=${domain}`)
        if (!res.ok) throw new Error('Error fetching categories')
        const data = await res.json()
        setCategories(data.categories || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchCategories()
  }, [domain])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!formData.name || !formData.price) {
      setError('El nombre y precio son obligatorios')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          categoryId: formData.categoryId || null,
          imageUrl: formData.imageUrl || null,
        }),
      })

      if (!res.ok) throw new Error('Error al crear producto')

      router.push(`/${domain}/admin/productos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando categorías...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Crear Nuevo Producto</h1>
        <Link href={`/${domain}/admin/productos`} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Volver
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">✕ {error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Nombre del Producto *</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="ej: Pizza Pepperoni"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="ej: Deliciosa pizza con queso mozzarella y pepperoni..."
            rows={3}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Precio (COP) *</label>
          <input
            type="number"
            step="100"
            min="0"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: e.target.value })}
            placeholder="ej: 25000"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Categoría</label>
          <select
            value={formData.categoryId}
            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin categoría</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Si no ves tus categorías,{' '}
            <Link href={`/${domain}/admin/categorias`} className="text-blue-600 hover:text-blue-700 font-medium">
              créalas aquí
            </Link>
          </p>
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">URL de Imagen</label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://example.com/product.jpg"
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Sube la imagen a un servicio como Imgur o Google Drive y copia el enlace aquí
          </p>
          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt="Preview"
              className="mt-3 h-32 w-32 object-cover rounded"
              onError={() => setError('Error al cargar la imagen')}
            />
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear Producto'}
          </button>
          <Link
            href={`/${domain}/admin/productos`}
            className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-center"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Consejos</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Usa descripciones claras y atractivas</li>
          <li>• Incluye ingredientes principales en la descripción</li>
          <li>• AgregaImagenes de buena calidad para aumentar ventas</li>
          <li>• Los precios deben incluir impuestos y servicios</li>
        </ul>
      </div>
    </div>
  )
}
