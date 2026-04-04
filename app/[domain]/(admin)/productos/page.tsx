'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  category_name?: string
  available: boolean
  featured: boolean
  image_url: string | null
  created_at: string
}

interface Category {
  id: string
  name: string
}

export default function ProductosPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as string

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`/api/products?domain=${domain}`),
          fetch(`/api/menu-categories?domain=${domain}`),
        ])

        if (!itemsRes.ok || !catsRes.ok) throw new Error('Error fetching data')

        const itemsData = await itemsRes.json()
        const catsData = await catsRes.json()

        setItems(itemsData.items || [])
        setCategories(catsData.categories || [])
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchData()
  }, [domain])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setItems(items.filter(item => item.id !== id))
    } catch (err) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setDeleting(null)
    }
  }

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter(item => item.category_id === filterCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Productos</h1>
          <p className="text-slate-600 mt-1">Gestiona tu menú y productos</p>
        </div>
        <Link
          href={`/${domain}/admin/productos/nuevo`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Nuevo Producto
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Todos ({items.length})
        </button>
        {categories.map(cat => {
          const count = items.filter(i => i.category_id === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Cargando productos...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-slate-600 text-lg font-medium mb-2">No hay productos</p>
              <Link
                href={`/${domain}/admin/productos/nuevo`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Crear el primer producto →
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Categoría</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Precio</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Destacado</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-lg">
                            🍽️
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.category_name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      ${item.price.toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.available ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Disponible
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          No disponible
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.featured ? (
                        <span className="text-yellow-600 text-lg">⭐</span>
                      ) : (
                        <span className="text-slate-300 text-lg">☆</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <Link
                        href={`/${domain}/admin/productos/${item.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                      >
                        {deleting === item.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Management Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 text-sm">
          ¿Necesitas gestionar categorías?{' '}
          <Link href={`/${domain}/admin/categorias`} className="font-medium text-blue-600 hover:text-blue-700">
            Ir a Categorías →
          </Link>
        </p>
      </div>
    </div>
  )
}
