'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Category { id: string; name: string; sort_order: number }
interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  available: boolean
  featured: boolean
}

export default function ProductosPage() {
  const { domain } = useParams() as { domain: string }
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)
    supabase
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single()
      .then(({ data }) => { if (data) setTenantId(data.id) })
  }, [domain])

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const [catRes, itemRes] = await Promise.all([
      supabase.from('menu_categories').select('id, name, sort_order').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('id, name, description, price, category_id, image_url, available, featured').eq('tenant_id', tenantId).order('name'),
    ])
    setCategories(catRes.data || [])
    setProducts(itemRes.data || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const toggleAvailable = async (product: Product) => {
    setTogglingId(product.id)
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !product.available })
      .eq('id', product.id)
    if (error) {
      toast.error('Error al cambiar disponibilidad')
    } else {
      setProducts(p => p.map(x => x.id === product.id ? { ...x, available: !x.available } : x))
    }
    setTogglingId(null)
  }

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products

  const uncategorized = filtered.filter(p => !p.category_id)

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-50 px-4 pt-4 pb-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Productos</h1>
            <p className="text-gray-400 text-xs">{products.length} en el menú</p>
          </div>
          <Link
            href={`/${domain}/admin/productos/nueva-categoria`}
            className="px-3 py-1.5 border rounded-xl text-sm text-gray-600 hover:bg-gray-100"
          >
            + Categoría
          </Link>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full px-4 py-2.5 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="px-4 pt-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-semibold text-gray-700 mb-1">
              {search ? 'Sin resultados' : 'Sin productos aún'}
            </p>
            <p className="text-gray-400 text-sm">
              {search ? `No encontramos "${search}"` : 'Usa el botón + para agregar'}
            </p>
          </div>
        ) : (
          <>
            {categories.map(cat => {
              const catProducts = filtered.filter(p => p.category_id === cat.id)
              if (catProducts.length === 0) return null
              return (
                <CategoryGroup
                  key={cat.id}
                  name={cat.name}
                  editHref={`/${domain}/admin/productos/categoria/${cat.id}`}
                  products={catProducts}
                  domain={domain}
                  togglingId={togglingId}
                  onToggle={toggleAvailable}
                />
              )
            })}
            {uncategorized.length > 0 && (
              <CategoryGroup
                name="Sin categoría"
                products={uncategorized}
                domain={domain}
                togglingId={togglingId}
                onToggle={toggleAvailable}
              />
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Link
        href={`/${domain}/admin/productos/nuevo`}
        className="fixed bottom-6 right-4 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all z-50"
        aria-label="Nuevo producto"
      >
        +
      </Link>
    </div>
  )
}

function CategoryGroup({
  name, editHref, products, domain, togglingId, onToggle,
}: {
  name: string
  editHref?: string
  products: Product[]
  domain: string
  togglingId: string | null
  onToggle: (p: Product) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{name}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{products.length}</span>
          {editHref && (
            <Link href={editHref} className="text-xs text-blue-600 font-medium">Editar</Link>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border divide-y overflow-hidden">
        {products.map(product => (
          <ProductRow
            key={product.id}
            product={product}
            domain={domain}
            toggling={togglingId === product.id}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}

function ProductRow({
  product, domain, toggling, onToggle,
}: {
  product: Product
  domain: string
  toggling: boolean
  onToggle: (p: Product) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3">
      {/* Image */}
      <Link href={`/${domain}/admin/productos/${product.id}`} className="flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🍽️</div>
        )}
      </Link>

      {/* Info */}
      <Link href={`/${domain}/admin/productos/${product.id}`} className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{product.name}</p>
        <p className="text-sm text-blue-600 font-medium">${Number(product.price).toLocaleString('es-CO')}</p>
        {product.featured && <span className="text-[10px] text-amber-600 font-semibold">⭐ Destacado</span>}
      </Link>

      {/* Toggle disponible */}
      <button
        onClick={() => onToggle(product)}
        disabled={toggling}
        className={`w-12 h-7 rounded-full transition-all flex items-center flex-shrink-0 ${
          product.available ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
        } ${toggling ? 'opacity-50' : ''}`}
      >
        <span className="w-6 h-6 bg-white rounded-full shadow-sm mx-0.5" />
      </button>
    </div>
  )
}
