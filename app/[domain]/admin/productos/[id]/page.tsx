'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenantResolver } from '@/lib/hooks/useTenantResolver'
import toast from 'react-hot-toast'
import ToppingsManager from '@/components/admin/ToppingsManager'

interface Props { params: Promise<{ domain: string; id: string }> }

export default function EditProductoPage({ params }: Props) {
  const { domain, id } = use(params)
  const router = useRouter()
  const { tenantId } = useTenantResolver(domain)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
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
    show_in_upsell: false,
    requires_kitchen: true,
  })

  const supabase = createClient()

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      supabase.from('menu_categories').select('id, name').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('id', id).eq('tenant_id', tenantId).single(),
    ]).then(([catRes, itemRes]) => {
      setCategories(catRes.data || [])
      if (!itemRes.data) { setNotFound(true) }
      else {
        const item = itemRes.data
        setForm({
          name: item.name,
          description: item.description || '',
          price: String(item.price),
          category_id: item.category_id || '',
          image_url: item.image_url || '',
          available: item.available,
          featured: item.featured,
          show_in_upsell: item.variants?.show_in_upsell || false,
          requires_kitchen: item.variants?.requires_kitchen !== false,
        })
      }
      setLoading(false)
    })
  }, [tenantId, id])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bucket', 'product-images')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, image_url: data.url }))
    } catch { toast.error('Error al subir imagen') }
    finally { setUploadingImage(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId) return
    if (!form.price || parseFloat(form.price) <= 0) { toast.error('Ingresa un precio válido'); return }
    setSaving(true)
    const updateData = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price),
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      available: form.available,
      featured: form.featured,
      variants: {
        show_in_upsell: form.show_in_upsell,
        requires_kitchen: form.requires_kitchen,
      },
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('menu_items').update(updateData).eq('id', id).eq('tenant_id', tenantId)
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message) }
    else { toast.success('Cambios guardados'); router.push(`/${domain}/admin/productos`) }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este producto del menú?')) return
    setDeleting(true)
    await supabase.from('menu_items').delete().eq('id', id).eq('tenant_id', tenantId)
    toast.success('Producto eliminado')
    router.push(`/${domain}/admin/productos`)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">Producto no encontrado</p>
      <button onClick={() => router.back()} className="text-blue-600 font-medium">Volver</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 sm:bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b sm:static sm:border-0 sm:bg-transparent sm:mb-6">
        <div className="px-4 sm:px-0 h-14 sm:h-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 sm:ml-0 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg sm:text-2xl truncate">{form.name || 'Editar Producto'}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
            <button
              form="product-form"
              type="submit"
              disabled={saving}
              className="hidden sm:block px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="sm:max-w-2xl sm:mx-auto flex flex-col sm:flex-row gap-4 sm:gap-6 pb-28 sm:pb-8">

          {/* Left: image */}
          <div className="sm:w-56 flex-shrink-0">
            <div className="bg-white sm:rounded-xl sm:border overflow-hidden">
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {form.image_url ? (
                  <div className="relative">
                    <img src={form.image_url} alt="" className="w-full aspect-square object-cover sm:rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 sm:rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-semibold">Cambiar foto</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square bg-gray-50 flex flex-col items-center justify-center gap-2 sm:rounded-xl sm:border-2 sm:border-dashed sm:border-gray-300 hover:sm:border-blue-400 transition-colors">
                    {uploadingImage ? (
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="text-5xl">📷</span>
                        <span className="text-sm font-medium text-gray-400">Agregar foto</span>
                      </>
                    )}
                  </div>
                )}
              </label>
              {form.image_url && (
                <div className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                    className="text-sm text-red-500 font-medium"
                  >
                    Eliminar foto
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: fields */}
          <div className="flex-1 space-y-3">

            <div className="bg-white sm:rounded-xl sm:border divide-y">
              <div className="px-4 py-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nombre *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-base sm:text-sm text-gray-900 focus:outline-none placeholder-gray-300 bg-transparent"
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="sm:grid sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0">
                <div className="px-4 py-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Precio *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">$</span>
                    <input
                      required
                      inputMode="decimal"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="flex-1 text-xl sm:text-base font-bold text-gray-900 focus:outline-none placeholder-gray-200 bg-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="px-4 py-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Categoría</label>
                  <select
                    value={form.category_id}
                    onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full text-base sm:text-sm text-gray-900 focus:outline-none bg-transparent appearance-none"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-4 py-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full text-base sm:text-sm text-gray-900 focus:outline-none placeholder-gray-300 resize-none bg-transparent"
                  rows={3}
                  placeholder="Ingredientes, alérgenos, especificaciones..."
                />
              </div>
            </div>

            <div className="bg-white sm:rounded-xl sm:border divide-y">
              <ToggleRow
                label="Disponible"
                description="Visible en el menú para los clientes"
                checked={form.available}
                onChange={v => setForm(f => ({ ...f, available: v }))}
              />
              <ToggleRow
                label="Destacado"
                description="Aparece en la sección de destacados"
                checked={form.featured}
                onChange={v => setForm(f => ({ ...f, featured: v }))}
              />
              <ToggleRow
                label="Completa tu pedido"
                description="Mostrar como sugerencia pequena en el kiosko"
                checked={form.show_in_upsell}
                onChange={v => setForm(f => ({ ...f, show_in_upsell: v }))}
              />
              <ToggleRow
                label="Requiere cocina"
                description="Desactivalo para bebidas o productos de entrega directa"
                checked={form.requires_kitchen}
                onChange={v => setForm(f => ({ ...f, requires_kitchen: v }))}
              />
            </div>

            {tenantId && (
              <ToppingsManager menuItemId={id} tenantId={tenantId} />
            )}

            <div className="hidden sm:block">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sticky save */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-medium text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all flex items-center flex-shrink-0 ml-4 ${checked ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'}`}
      >
        <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
      </button>
    </label>
  )
}
