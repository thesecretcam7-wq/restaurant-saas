'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string; id: string }> }

export default function EditarCategoriaPage({ params }: Props) {
  const { domain: slug, id: categoryId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', sort_order: '0', active: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single()
      const tid = tenant?.id || slug
      setTenantId(tid)

      const { data: cat } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('id', categoryId)
        .single()

      if (cat) {
        setForm({
          name: cat.name || '',
          description: cat.description || '',
          sort_order: String(cat.sort_order ?? 0),
          active: cat.active ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [slug, categoryId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('menu_categories')
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        sort_order: parseInt(form.sort_order) || 0,
        active: form.active,
      })
      .eq('id', categoryId)
    setSaving(false)
    if (err) { setError(err.message); return }
    router.push(`/${tenantId}/admin/productos`)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.')) return
    setDeleting(true)
    await supabase.from('menu_categories').delete().eq('id', categoryId)
    router.push(`/${tenantId}/admin/productos`)
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>

  return (
    <div className="max-w-lg p-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${tenantId}/admin/productos`} className="text-gray-500 hover:text-gray-700 text-lg">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Categoría</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

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

        <label className="flex items-center justify-between cursor-pointer py-1">
          <div>
            <p className="text-sm font-medium text-gray-700">Categoría activa</p>
            <p className="text-xs text-gray-400">Visible en el menú para los clientes</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, active: !f.active }))}
            className={`w-11 h-6 rounded-full transition-all flex items-center ml-4 ${form.active ? 'bg-blue-500 justify-end' : 'bg-gray-200 justify-start'}`}
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
          <Link href={`/${tenantId}/admin/productos`} className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>

      <div className="mt-6 bg-white rounded-xl border border-red-200 p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Zona de peligro</h3>
        <p className="text-xs text-gray-500 mb-3">Los productos de esta categoría quedarán sin categoría asignada.</p>
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
