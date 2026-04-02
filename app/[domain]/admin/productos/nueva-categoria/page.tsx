'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default function NuevaCategoriaPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const [form, setForm] = useState({ name: '', description: '', sort_order: '0' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.from('menu_categories').insert({
      tenant_id: tenantId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      sort_order: parseInt(form.sort_order) || 0,
      active: true,
    })
    setLoading(false)
    if (err) { setError('Error al crear la categoría'); return }
    router.push(`/${tenantId}/admin/productos`)
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${tenantId}/admin/productos`} className="text-gray-500 hover:text-gray-700">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva Categoría</h1>
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
            placeholder="Ej: Pizzas, Bebidas, Postres..."
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
            placeholder="Descripción opcional..."
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

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Guardando...' : 'Crear Categoría'}
          </button>
          <Link href={`/${tenantId}/admin/productos`} className="px-6 py-2.5 border rounded-lg text-sm hover:bg-gray-50">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
