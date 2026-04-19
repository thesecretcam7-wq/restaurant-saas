import { createServiceClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import AddToCartButton from '@/components/store/AddToCartButton'

interface CategoryPageProps {
  params: Promise<{ domain: string; id: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { domain, id: categoryId } = await params
  const supabase = createServiceClient()
  const context = await getTenantContext(domain)

  if (!context.tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante No Encontrado</h1>
          <a href="/" className="text-blue-600 hover:underline">Volver al inicio</a>
        </div>
      </div>
    )
  }

  const [categoryRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('id', categoryId).eq('tenant_id', context.tenant?.id).single(),
    supabase.from('menu_items').select('*').eq('tenant_id', context.tenant?.id).eq('category_id', categoryId).eq('available', true).order('featured', { ascending: false }),
  ])

  const category = categoryRes.data
  const items = itemsRes.data || []
  const branding = context.branding

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Categoría No Encontrada</h1>
          <a href={`/${context.tenant?.slug || domain}`} className="text-blue-600 hover:underline">Volver al menú</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding?.background_color }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <a href={`/${context.tenant?.slug || tenantId}`} className="text-2xl">←</a>
            <a href={`/${context.tenant?.slug || tenantId}/carrito`} className="relative p-2">
              <span className="text-xl">🛒</span>
            </a>
          </div>
          <div>
            <h1 className="font-bold text-2xl" style={{ color: branding?.primary_color }}>
              {category.name}
            </h1>
            {category.description && (
              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No hay productos en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <MenuItemCard key={item.id} item={item} tenantSlug={context.tenant?.slug || domain} branding={branding} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function MenuItemCard({ item, tenantSlug, branding }: { item: any; tenantSlug: string; branding: any }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden flex items-center gap-4 p-3 hover:shadow-md transition-shadow">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{item.name}</p>
        {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
        <p className="font-bold mt-2" style={{ color: branding?.primary_color }}>
          {formatPrice(item.price)}
        </p>
      </div>
      <AddToCartButton item={item} tenantId={tenantSlug} color={branding?.primary_color} />
    </div>
  )
}
