'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, ChefHat, GripVertical, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadTenantMedia } from '@/lib/upload-client'

interface CategoryProduct {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  available: boolean
  show_in_store: boolean
  featured: boolean
  sort_order: number
}

interface Props {
  domain: string
  tenantId: string
  categoryId: string
  initialProducts: CategoryProduct[]
  initialData: {
    name: string
    description: string
    sort_order: string
    active: boolean
    image_url: string
  }
}

export default function EditarCategoriaClient({
  domain,
  tenantId,
  categoryId,
  initialProducts,
  initialData,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState(initialData)
  const [products, setProducts] = useState(initialProducts)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(initialData.image_url)

  const sortedProducts = [...products].sort((a, b) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  )

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const url = await uploadTenantMedia({ file, bucket: 'images', tenantId })
      setForm(f => ({ ...f, image_url: url }))
      setPreview(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          categoryId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          sortOrder: parseInt(form.sort_order) || 0,
          imageUrl: form.image_url || null,
          active: form.active,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al guardar la categoria')
        setSaving(false)
        return
      }

      router.push(`/${domain}/admin/productos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la categoria')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Eliminar esta categoria? Los productos quedaran sin categoria.')) return
    setDeleting(true)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          categoryId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al eliminar la categoria')
        setDeleting(false)
        return
      }

      router.push(`/${domain}/admin/productos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la categoria')
      setDeleting(false)
    }
  }

  const moveProduct = async (product: CategoryProduct, direction: -1 | 1) => {
    const currentIndex = sortedProducts.findIndex(item => item.id === product.id)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedProducts.length) return

    const reordered = [...sortedProducts]
    const [moved] = reordered.splice(currentIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const updates = reordered.map((item, index) => ({ id: item.id, sort_order: index * 10 }))
    const previousProducts = products
    setProducts(current => current.map(item => {
      const update = updates.find(row => row.id === item.id)
      return update ? { ...item, sort_order: update.sort_order } : item
    }))
    setMovingId(product.id)

    const results = await Promise.all(updates.map(update =>
      supabase
        .from('menu_items')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('tenant_id', tenantId)
        .eq('category_id', categoryId)
    ))
    const updateError = results.find(result => result.error)?.error

    setMovingId(null)
    if (updateError) {
      setProducts(previousProducts)
      toast.error('No se pudo guardar el orden')
    } else {
      toast.success('Orden guardado')
    }
  }

  return (
    <div className="max-w-5xl p-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href={`/${domain}/admin/productos`} className="text-lg text-gray-500 hover:text-gray-700">
          &larr;
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar categoria</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Orden de aparicion</label>
            <input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">0 = primera posicion</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Imagen de categoria</label>
            {preview && (
              <div className="relative mb-3">
                <img src={preview} alt="preview" className="h-40 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, image_url: '' }))
                    setPreview('')
                  }}
                  className="absolute right-2 top-2 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploading}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, GIF max 5MB</p>
          </div>

          <label className="flex cursor-pointer items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-700">Categoria activa</p>
              <p className="text-xs text-gray-400">Visible en el menu para los clientes</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={`ml-4 flex h-6 w-11 items-center rounded-full transition-all ${
                form.active ? 'justify-end bg-blue-500' : 'justify-start bg-gray-200'
              }`}
            >
              <span className="mx-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
            </button>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <Link
              href={`/${domain}/admin/productos`}
              className="rounded-lg border px-6 py-2.5 text-sm hover:bg-gray-50"
            >
              Cancelar
            </Link>
          </div>
        </form>

        <section className="rounded-xl border bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Orden de productos</h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">
              Este orden se usa en TPV, tienda, mesa QR, carta QR y kiosko.
            </p>
          </div>

          {sortedProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <ChefHat className="mx-auto mb-3 size-8 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">Esta categoria aun no tiene productos.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {sortedProducts.map((product, index) => (
                <div key={product.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <GripVertical className="size-4 flex-shrink-0 text-gray-300" />
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="size-12 flex-shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid size-12 flex-shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-400">
                        <ChefHat className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="truncate text-xs font-semibold text-gray-500">{product.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${product.available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          Disponible {product.available ? 'Si' : 'No'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${product.show_in_store !== false ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                          <Store className="size-3" />
                          Tienda {product.show_in_store !== false ? 'Si' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveProduct(product, -1)}
                      disabled={index === 0 || movingId !== null}
                      className="grid size-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      title="Subir producto"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProduct(product, 1)}
                      disabled={index === sortedProducts.length - 1 || movingId !== null}
                      className="grid size-9 place-items-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      title="Bajar producto"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-white p-5">
        <h3 className="mb-1 text-sm font-semibold text-red-700">Zona de peligro</h3>
        <p className="mb-3 text-xs text-gray-500">
          Los productos de esta categoria quedaran sin categoria asignada.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Eliminando...' : 'Eliminar categoria'}
        </button>
      </div>
    </div>
  )
}
