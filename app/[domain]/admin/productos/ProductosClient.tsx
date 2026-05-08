'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ChefHat, Edit3, PackageOpen, Plus, Search, Sparkles } from 'lucide-react'

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

export default function ProductosClient({
  domain,
  categories,
  initialProducts,
}: {
  domain: string
  categories: Category[]
  initialProducts: Product[]
  tenantId: string
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

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
  const isSearching = search.trim().length > 0
  const uncategorized = filtered.filter(p => !p.category_id)
  const availableCount = products.filter(p => p.available).length
  const visibleCategories = categories
    .map(category => ({
      category,
      products: filtered.filter(p => p.category_id === category.id),
    }))
    .filter(group => group.products.length > 0 || !isSearching)

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Menu</p>
          <h1 className="admin-title">Productos</h1>
          <p className="admin-subtitle">{products.length} productos, {availableCount} disponibles para venta.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/${domain}/admin/productos/nueva-categoria`} className="admin-button-ghost">
            <Plus className="size-4" />
            Categoria
          </Link>
          <Link href={`/${domain}/admin/productos/nuevo`} className="admin-button-primary">
            <Plus className="size-4" />
            Producto
          </Link>
        </div>
      </div>

      <div className="admin-panel mb-5 p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/32" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="admin-input pl-10"
          />
        </label>
      </div>

      <div className="space-y-5">
        {products.length === 0 && categories.length === 0 ? (
          <div className="admin-empty">
            <PackageOpen className="mb-3 size-8 text-black/24" />
            <p className="font-black text-[#15130f]">Sin productos aun</p>
            <p className="mt-1 text-sm">Crea tu primera categoria o producto para empezar a vender.</p>
          </div>
        ) : isSearching && filtered.length === 0 ? (
          <div className="admin-empty">
            <PackageOpen className="mb-3 size-8 text-black/24" />
            <p className="font-black text-[#15130f]">Sin resultados</p>
            <p className="mt-1 text-sm">No encontramos "{search}".</p>
          </div>
        ) : (
          <>
            {visibleCategories.map(({ category, products: categoryProducts }) => (
              <CategoryGroup
                key={category.id}
                name={category.name}
                editHref={`/${domain}/admin/productos/categoria/${category.id}`}
                products={categoryProducts}
                domain={domain}
                togglingId={togglingId}
                onToggle={toggleAvailable}
              />
            ))}
            {uncategorized.length > 0 && (
              <CategoryGroup
                name="Sin categoria"
                products={uncategorized}
                domain={domain}
                togglingId={togglingId}
                onToggle={toggleAvailable}
              />
            )}
          </>
        )}
      </div>
      {categories.length > 0 && products.length === 0 && (
        <p className="mt-5 text-center text-sm font-semibold text-black/45">
          Las categorias ya estan listas. Agrega productos cuando quieras.
        </p>
      )}
    </div>
  )
}

function CategoryGroup({
  name,
  editHref,
  products,
  domain,
  togglingId,
  onToggle,
}: {
  name: string
  editHref?: string
  products: Product[]
  domain: string
  togglingId: string | null
  onToggle: (p: Product) => void
}) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div>
          <h2 className="font-black text-[#15130f]">{name}</h2>
          <p className="text-xs font-semibold text-black/45">{products.length} productos</p>
        </div>
        {editHref && (
          <Link href={editHref} className="inline-flex items-center gap-1.5 text-sm font-black text-[#e43d30]">
            <Edit3 className="size-4" />
            Editar
          </Link>
        )}
      </div>
      <div className="divide-y divide-black/8">
        {products.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <PackageOpen className="mx-auto mb-3 size-7 text-black/22" />
            <p className="text-sm font-bold text-black/45">Categoria vacia</p>
            <p className="mt-1 text-xs font-semibold text-black/35">Agrega un producto cuando este listo.</p>
          </div>
        ) : products.map(product => (
          <ProductRow
            key={product.id}
            product={product}
            domain={domain}
            toggling={togglingId === product.id}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  )
}

function ProductRow({
  product,
  domain,
  toggling,
  onToggle,
}: {
  product: Product
  domain: string
  toggling: boolean
  onToggle: (p: Product) => void
}) {
  return (
    <div className="grid gap-3 px-5 py-4 transition hover:bg-white/70 sm:grid-cols-[1fr_auto] sm:items-center">
      <Link href={`/${domain}/admin/productos/${product.id}`} className="flex min-w-0 items-center gap-3">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="size-14 flex-shrink-0 rounded-xl object-cover shadow-sm" />
        ) : (
          <span className="flex size-14 flex-shrink-0 items-center justify-center rounded-xl bg-black/5 text-black/35">
            <ChefHat className="size-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-black text-[#15130f]">{product.name}</span>
            {product.featured && <Sparkles className="size-4 flex-shrink-0 text-[#c47a16]" />}
          </span>
          {product.description && <span className="mt-0.5 block truncate text-xs font-semibold text-black/45">{product.description}</span>}
          <span className="mt-1 block text-sm font-black text-[#e43d30]">${Number(product.price).toLocaleString('es-CO')}</span>
        </span>
      </Link>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className={`admin-chip ${product.available ? 'text-[#1c8b5f]' : 'text-black/40'}`}>
          {product.available ? 'Disponible' : 'Oculto'}
        </span>
        <button
          onClick={() => onToggle(product)}
          disabled={toggling}
          className={`flex h-7 w-12 items-center rounded-full p-0.5 transition ${
            product.available ? 'justify-end bg-[#1c8b5f]' : 'justify-start bg-black/18'
          } ${toggling ? 'opacity-50' : ''}`}
          aria-label="Cambiar disponibilidad"
        >
          <span className="size-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>
    </div>
  )
}
