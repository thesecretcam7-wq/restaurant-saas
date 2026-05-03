'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  domain: string
  tenantId: string
  categoryId: string
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
  initialData,
}: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(initialData.image_url)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', 'images')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(f => ({ ...f, image_url: data.url }))
      setPreview(data.url)
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
        setError(data.error || 'Error al guardar la categoría')
        setSaving(false)
        return
      }

      router.push(`/${domain}/admin/productos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la categoría')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.')) return
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
        setError(data.error || 'Error al eliminar la categoría')
        setDeleting(false)
        return
      }

      router.push(`/${domain}/admin/productos`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la categoría')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-lg p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${domain}/admin/productos`} className="text-gray-500 hover:text-gray-700 text-lg">
          ←
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Categoría</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orden de aparición</label>
          <input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">0 = primera posición</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imagen de categoría</label>
          {preview && (
            <div className="mb-3 relative">
              <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => {
                  setForm(f => ({ ...f, image_url: '' }))
                  setPreview('')
                }}
                className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
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
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (máx 5MB)</p>
        </div>

        <label className="flex items-center justify-between cursor-pointer py-1">
          <div>
            <p className="text-sm font-medium text-gray-700">Categoría activa</p>
            <p className="text-xs text-gray-400">Visible en el menú para los clientes</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, active: !f.active }))}
            className={`w-11 h-6 rounded-full transition-all flex items-center ml-4 ${
              form.active ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'
            }`}
          >
            <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
          </button>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link
            href={`/${domain}/admin/productos`}
            className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <div className="mt-6 bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Zona de peligro</h3>
        <p className="text-xs text-gray-500 mb-3">
          Los productos de esta categoría quedarán sin categoría asignada.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {deleting ? 'Eliminando...' : 'Eliminar categoría'}
        </button>
      </div>
    </div>
  )
}
