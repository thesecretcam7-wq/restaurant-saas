'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { productSchema } from '@/lib/validations/forms'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'
import toast from 'react-hot-toast'

interface Category { id: string; name: string }

interface Props {
  domain: string
  tenantId: string
  categories: Category[]
}

export default function NuevoProductoClient({ domain, tenantId, categories }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    available: true,
    featured: false,
  })

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
    setErrors([])
    setSaving(true)
    try {
      const validated = productSchema.parse(form)

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: validated.name.trim(),
          description: validated.description?.trim() || null,
          price: validated.price,
          categoryId: validated.category_id || null,
          imageUrl: validated.image_url || null,
          available: validated.available,
          featured: validated.featured,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al guardar el producto')
        setSaving(false)
        return
      }

      toast.success('Producto guardado')
      router.push(`/${domain}/admin/productos`)
    } catch (error: any) {
      if (error.errors) {
        const validationErrors = parseValidationError(error)
        setErrors(validationErrors)
        toast.error(validationErrors[0]?.message || 'Corrige los errores del formulario')
      } else {
        toast.error('Error al guardar el producto')
      }
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 sm:bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b sm:static sm:border-0 sm:bg-transparent sm:mb-6">
        <div className="px-4 sm:px-0 h-14 sm:h-auto sm:py-0 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 sm:ml-0 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg sm:text-2xl">Nuevo Producto</h1>
          <button
            form="product-form"
            type="submit"
            disabled={saving}
            className="ml-auto hidden sm:block px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        <div className="sm:max-w-2xl sm:mx-auto sm:px-0 flex flex-col sm:flex-row gap-4 sm:gap-6 pb-28 sm:pb-8">
          {/* Left column: image */}
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
                        <span className="text-xs text-gray-300 sm:hidden">Cámara o galería</span>
                      </>
                    )}
                  </div>
                )}
              </label>
              {form.image_url && (
                <div className="px-4 py-2 sm:px-3 sm:py-2">
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

          {/* Right column: fields */}
          <div className="flex-1 space-y-3 px-0">
            {/* Main info card */}
            <div className="bg-white sm:rounded-xl sm:border divide-y">
              {/* Name */}
              <div className="px-4 py-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Nombre * {getFieldError(errors, 'name') && <span className="text-red-500">{getFieldError(errors, 'name')}</span>}
                </label>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={`w-full text-base sm:text-sm text-gray-900 focus:outline-none placeholder-gray-300 bg-transparent border-b-2 ${getFieldError(errors, 'name') ? 'border-red-300' : 'border-gray-200'}`}
                  placeholder="Ej: Pizza Margherita"
                />
              </div>

              {/* Price + Category side by side on desktop */}
              <div className="sm:grid sm:grid-cols-2 sm:divide-x divide-y sm:divide-y-0">
                <div className="px-4 py-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Precio * {getFieldError(errors, 'price') && <span className="text-red-500">{getFieldError(errors, 'price')}</span>}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 font-medium">$</span>
                    <input
                      required
                      inputMode="decimal"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className={`flex-1 text-xl sm:text-base font-bold text-gray-900 focus:outline-none placeholder-gray-200 bg-transparent border-b-2 ${getFieldError(errors, 'price') ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="px-4 py-4">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Categoría
                  </label>
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

              {/* Description */}
              <div className="px-4 py-4">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Descripción {getFieldError(errors, 'description') && <span className="text-red-500">{getFieldError(errors, 'description')}</span>}
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`w-full text-base sm:text-sm text-gray-900 focus:outline-none placeholder-gray-300 resize-none bg-transparent border-b-2 ${getFieldError(errors, 'description') ? 'border-red-300' : 'border-gray-200'}`}
                  rows={3}
                  placeholder="Ingredientes, alérgenos, especificaciones..."
                />
              </div>
            </div>

            {/* Toggles card */}
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
            </div>

            {/* Save button — desktop inline, mobile sticky bottom */}
            <div className="hidden sm:block">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sticky save button */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-bottom">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando...' : 'Guardar Producto'}
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
