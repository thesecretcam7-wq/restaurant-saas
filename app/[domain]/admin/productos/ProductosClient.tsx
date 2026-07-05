'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, ChefHat, ChevronLeft, Edit3, Folder, FolderOpen, PackageOpen, Plus, Search, Sparkles, Store } from 'lucide-react'
import { formatPriceWithCurrency } from '@/lib/currency'

interface Category { id: string; name: string; sort_order: number }
interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  available: boolean
  show_in_store: boolean
  featured: boolean
  sort_order: number
}

export default function ProductosClient({
  domain,
  categories,
  initialProducts,
  tenantId,
  currencyInfo,
}: {
  domain: string
  categories: Category[]
  initialProducts: Product[]
  tenantId: string
  currencyInfo: { code: string; locale: string }
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const supabase = createClient()

  const toggleAvailable = async (product: Product) => {
    setTogglingId(product.id)
    const { error } = await supabase
      .from('menu_items')
      .update({ available: !product.available })
      .eq('id', product.id)
      .eq('tenant_id', tenantId)

    if (error) {
      toast.error('Error al cambiar disponibilidad')
    } else {
      setProducts(p => p.map(x => x.id === product.id ? { ...x, available: !x.available } : x))
    }
    setTogglingId(null)
  }

  const toggleStoreVisibility = async (product: Product) => {
    setTogglingId(product.id)
    const nextValue = product.show_in_store !== false ? false : true
    const { error } = await supabase
      .from('menu_items')
      .update({ show_in_store: nextValue })
      .eq('id', product.id)
      .eq('tenant_id', tenantId)

    if (error) {
      toast.error('Error al cambiar visibilidad en tienda')
    } else {
      setProducts(p => p.map(x => x.id === product.id ? { ...x, show_in_store: nextValue } : x))
    }
    setTogglingId(null)
  }

  const reorderProducts = async (categoryProducts: Product[], product: Product, direction: -1 | 1) => {
    const currentIndex = categoryProducts.findIndex(item => item.id === product.id)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categoryProducts.length) return

    const reordered = [...categoryProducts]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const updates = reordered.map((item, index) => ({ id: item.id, sort_order: index * 10 }))

    setProducts(current => current.map(item => {
      const update = updates.find(row => row.id === item.id)
      return update ? { ...item, sort_order: update.sort_order } : item
    }))

    const results = await Promise.all(updates.map(update =>
      supabase.from('menu_items').update({ sort_order: update.sort_order }).eq('id', update.id).eq('tenant_id', tenantId)
    ))
    const error = results.find(result => result.error)?.error
    if (error) {
      toast.error('Error al guardar el orden')
    }
  }

  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products
  const isSearching = search.trim().length > 0
  const uncategorized = filtered.filter(p => !p.category_id)
  const sortProducts = (list: Product[]) => [...list].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  )
  const availableCount = products.filter(p => p.available).length
  const storeVisibleCount = products.filter(p => p.available && p.show_in_store !== false).length
  const visibleCategories = categories
    .map(category => ({
      category,
      products: sortProducts(filtered.filter(p => p.category_id === category.id)),
    }))
    .filter(group => group.products.length > 0 || !isSearching)
  const folderGroups = categories.map(category => ({
    id: category.id,
    name: category.name,
    products: sortProducts(products.filter(p => p.category_id === category.id)),
    editHref: `/${domain}/admin/productos/categoria/${category.id}`,
    addHref: `/${domain}/admin/productos/nuevo?categoria=${category.id}`,
  }))
  const uncategorizedProducts = sortProducts(products.filter(p => !p.category_id))
  const folderViewGroups = [
    ...folderGroups,
    ...(uncategorizedProducts.length > 0 ? [{
      id: 'uncategorized',
      name: 'Sin categoria',
      products: uncategorizedProducts,
      editHref: undefined,
      addHref: `/${domain}/admin/productos/nuevo`,
    }] : []),
  ]
  const activeFolder = folderViewGroups.find(group => group.id === activeCategoryId) || null

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Menu</p>
          <h1 className="admin-title">Productos</h1>
          <p className="admin-subtitle">{products.length} productos, {availableCount} disponibles en TPV, {storeVisibleCount} visibles en tienda.</p>
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
        ) : !isSearching && !activeFolder ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {folderViewGroups.map(group => (
              <CategoryFolder
                key={group.id}
                name={group.name}
                count={group.products.length}
                availableCount={group.products.filter(product => product.available).length}
                addHref={group.addHref}
                editHref={group.editHref}
                onOpen={() => setActiveCategoryId(group.id)}
              />
            ))}
          </div>
        ) : !isSearching && activeFolder ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className="admin-button-ghost w-fit"
              >
                <ChevronLeft className="size-4" />
                Carpetas
              </button>
              <Link href={activeFolder.addHref} className="admin-button-primary w-fit">
                <Plus className="size-4" />
                Agregar producto aqui
              </Link>
            </div>
            <CategoryGroup
              name={activeFolder.name}
              editHref={activeFolder.editHref}
              addHref={activeFolder.addHref}
              products={activeFolder.products}
              domain={domain}
              togglingId={togglingId}
              onToggle={toggleAvailable}
              onToggleStore={toggleStoreVisibility}
              onReorder={reorderProducts}
              currencyInfo={currencyInfo}
            />
          </>
        ) : (
          <>
            {visibleCategories.map(({ category, products: categoryProducts }) => (
              <CategoryGroup
                key={category.id}
                name={category.name}
                editHref={`/${domain}/admin/productos/categoria/${category.id}`}
                addHref={`/${domain}/admin/productos/nuevo?categoria=${category.id}`}
                products={categoryProducts}
                domain={domain}
                togglingId={togglingId}
                onToggle={toggleAvailable}
                onToggleStore={toggleStoreVisibility}
                onReorder={reorderProducts}
                currencyInfo={currencyInfo}
              />
            ))}
            {uncategorized.length > 0 && (
              <CategoryGroup
                name="Sin categoria"
                products={sortProducts(uncategorized)}
                addHref={`/${domain}/admin/productos/nuevo`}
                domain={domain}
                togglingId={togglingId}
                onToggle={toggleAvailable}
                onToggleStore={toggleStoreVisibility}
                onReorder={reorderProducts}
                currencyInfo={currencyInfo}
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

function CategoryFolder({
  name,
  count,
  availableCount,
  addHref,
  editHref,
  onOpen,
}: {
  name: string
  count: number
  availableCount: number
  addHref: string
  editHref?: string
  onOpen: () => void
}) {
  return (
    <div className="admin-panel p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 text-left"
      >
        <span className="grid size-12 flex-shrink-0 place-items-center rounded-xl bg-[#e43d30]/10 text-[#e43d30]">
          {count > 0 ? <FolderOpen className="size-7" /> : <Folder className="size-7" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-black text-[#15130f]">{name}</span>
          <span className="mt-1 block text-xs font-semibold text-black/45">
            {count} productos, {availableCount} disponibles
          </span>
        </span>
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={addHref} className="admin-button-primary min-h-9 px-3 py-2 text-xs">
          <Plus className="size-4" />
          Agregar
        </Link>
        {editHref && (
          <Link href={editHref} className="admin-button-ghost min-h-9 px-3 py-2 text-xs">
            <Edit3 className="size-4" />
            Editar
          </Link>
        )}
      </div>
    </div>
  )
}

function CategoryGroup({
  name,
  editHref,
  addHref,
  products,
  domain,
  togglingId,
  onToggle,
  onToggleStore,
  onReorder,
  currencyInfo,
}: {
  name: string
  editHref?: string
  addHref?: string
  products: Product[]
  domain: string
  togglingId: string | null
  onToggle: (p: Product) => void
  onToggleStore: (p: Product) => void
  onReorder: (products: Product[], product: Product, direction: -1 | 1) => void
  currencyInfo: { code: string; locale: string }
}) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
        <div>
          <h2 className="font-black text-[#15130f]">{name}</h2>
          <p className="text-xs font-semibold text-black/45">{products.length} productos</p>
        </div>
        <div className="flex items-center gap-2">
          {addHref && (
            <Link href={addHref} className="inline-flex items-center gap-1.5 text-sm font-black text-[#1c8b5f]">
              <Plus className="size-4" />
              Agregar
            </Link>
          )}
          {editHref && (
            <Link href={editHref} className="inline-flex items-center gap-1.5 text-sm font-black text-[#e43d30]">
              <Edit3 className="size-4" />
              Editar
            </Link>
          )}
        </div>
      </div>
      <div className="divide-y divide-black/8">
        {products.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <PackageOpen className="mx-auto mb-3 size-7 text-black/22" />
            <p className="text-sm font-bold text-black/45">Categoria vacia</p>
            <p className="mt-1 text-xs font-semibold text-black/35">Agrega un producto cuando este listo.</p>
          </div>
        ) : products.map((product, index) => (
          <ProductRow
            key={product.id}
            product={product}
            domain={domain}
            toggling={togglingId === product.id}
            onToggle={onToggle}
            onToggleStore={onToggleStore}
            onMoveUp={() => onReorder(products, product, -1)}
            onMoveDown={() => onReorder(products, product, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < products.length - 1}
            currencyInfo={currencyInfo}
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
  onToggleStore,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  currencyInfo,
}: {
  product: Product
  domain: string
  toggling: boolean
  onToggle: (p: Product) => void
  onToggleStore: (p: Product) => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  currencyInfo: { code: string; locale: string }
}) {
  return (
    <div
      id={`product-${product.id}`}
      className="scroll-mt-24 grid gap-3 px-5 py-4 transition hover:bg-white/70 sm:grid-cols-[1fr_auto] sm:items-center"
    >
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
          <span className="mt-1 block text-sm font-black text-[#e43d30]">
            {formatPriceWithCurrency(Number(product.price || 0), currencyInfo.code, currencyInfo.locale)}
          </span>
        </span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp || toggling}
            className="grid size-8 place-items-center rounded-lg border border-black/10 text-black/55 transition hover:bg-black/5 disabled:opacity-25"
            title="Subir producto"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown || toggling}
            className="grid size-8 place-items-center rounded-lg border border-black/10 text-black/55 transition hover:bg-black/5 disabled:opacity-25"
            title="Bajar producto"
          >
            <ArrowDown className="size-4" />
          </button>
        </div>
        <span className={`admin-chip ${product.available ? 'text-[#1c8b5f]' : 'text-black/40'}`}>
          Disponible {product.available ? 'Si' : 'No'}
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
        <span className={`admin-chip ${product.show_in_store !== false ? 'text-[#1c8b5f]' : 'text-black/40'}`}>
          <Store className="mr-1 inline size-3" />
          Tienda {product.show_in_store !== false ? 'Si' : 'No'}
        </span>
        <button
          onClick={() => onToggleStore(product)}
          disabled={toggling}
          className={`flex h-7 w-12 items-center rounded-full p-0.5 transition ${
            product.show_in_store !== false ? 'justify-end bg-[#1c8b5f]' : 'justify-start bg-black/18'
          } ${toggling ? 'opacity-50' : ''}`}
          aria-label="Cambiar visibilidad en tienda"
        >
          <span className="size-6 rounded-full bg-white shadow-sm" />
        </button>
      </div>
    </div>
  )
}
