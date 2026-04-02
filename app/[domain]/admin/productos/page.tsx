import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface ProductosProps {
  params: Promise<{ domain: string }>
}

export default async function ProductosPage({ params }: ProductosProps) {
  const { domain: tenantId } = await params
  const supabase = await createServiceClient()

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
    supabase.from('menu_items').select('*, menu_categories(name)').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
  ])

  const categories = categoriesRes.data || []
  const items = itemsRes.data || []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} productos en tu menú</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/${tenantId}/admin/productos/nueva-categoria`}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            + Categoría
          </Link>
          <Link
            href={`/${tenantId}/admin/productos/nuevo`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            + Producto
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <h3 className="text-lg font-semibold mb-2">Sin productos aún</h3>
          <p className="text-gray-500 mb-6">Agrega tus primeros productos al menú</p>
          <Link href={`/${tenantId}/admin/productos/nuevo`} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Agregar Producto
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.length > 0 ? (
            categories.map(cat => {
              const catItems = items.filter(i => i.category_id === cat.id)
              if (catItems.length === 0) return null
              return (
                <div key={cat.id} className="bg-white rounded-xl border">
                  <div className="px-5 py-3 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                    <h3 className="font-medium text-gray-700">{cat.name}</h3>
                    <span className="text-sm text-gray-400">{catItems.length} productos</span>
                  </div>
                  <ProductList items={catItems} tenantId={tenantId} />
                </div>
              )
            })
          ) : null}

          {/* Items without category */}
          {(() => {
            const uncategorized = items.filter(i => !i.category_id)
            if (uncategorized.length === 0) return null
            return (
              <div className="bg-white rounded-xl border">
                <div className="px-5 py-3 border-b bg-gray-50 rounded-t-xl">
                  <h3 className="font-medium text-gray-700">Sin categoría</h3>
                </div>
                <ProductList items={uncategorized} tenantId={tenantId} />
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function ProductList({ items, tenantId }: { items: any[], tenantId: string }) {
  return (
    <div className="divide-y">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-4 p-4">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{item.name}</p>
            {item.description && <p className="text-sm text-gray-500 truncate">{item.description}</p>}
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold">${Number(item.price).toLocaleString('es-CO')}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {item.available ? 'Activo' : 'Oculto'}
            </span>
            <Link
              href={`/${tenantId}/admin/productos/${item.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Editar
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
