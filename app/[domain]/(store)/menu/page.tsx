import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import AddToCartButton from '@/components/store/AddToCartButton'

interface MenuProps {
  params: Promise<{ domain: string }>
}

export default async function MenuPage({ params }: MenuProps) {
  const { domain: tenantId } = await params
  const supabase = await createClient()
  const context = await getTenantContext(tenantId)

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
    supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true).order('featured', { ascending: false }),
  ])

  const categories = categoriesRes.data || []
  const items = itemsRes.data || []
  const branding = context.branding

  const featured = items.filter(i => i.featured)

  return (
    <div className="min-h-screen" style={{ backgroundColor: branding?.background_color }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-lg" style={{ color: branding?.primary_color }}>
            {branding?.app_name || context.tenant?.organization_name}
          </h1>
          <a href={`/${tenantId}/carrito`} className="relative p-2">
            <span className="text-xl">🛒</span>
          </a>
        </div>
        {/* Category pills nav */}
        {categories.length > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <a
                key={cat.id}
                href={`/${tenantId}/categoria/${cat.id}`}
                className="px-4 py-1.5 rounded-full text-sm whitespace-nowrap border hover:opacity-80 transition-opacity"
                style={{ borderColor: branding?.primary_color, color: branding?.primary_color }}
              >
                {cat.name}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: branding?.secondary_color }}>⭐ Destacados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featured.map(item => (
                <MenuItemCard key={item.id} item={item} tenantId={tenantId} branding={branding} featured />
              ))}
            </div>
          </section>
        )}

        {/* By category */}
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id)
          if (catItems.length === 0) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-28">
              <h2 className="text-lg font-bold mb-4" style={{ color: branding?.secondary_color }}>{cat.name}</h2>
              <div className="space-y-3">
                {catItems.map(item => (
                  <MenuItemCard key={item.id} item={item} tenantId={tenantId} branding={branding} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Items without category */}
        {items.filter(i => !i.category_id).length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: branding?.secondary_color }}>Otros</h2>
            <div className="space-y-3">
              {items.filter(i => !i.category_id).map(item => (
                <MenuItemCard key={item.id} item={item} tenantId={tenantId} branding={branding} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function MenuItemCard({ item, tenantId, branding, featured = false }: { item: any, tenantId: string, branding: any, featured?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border overflow-hidden flex ${featured ? 'flex-col' : 'items-center gap-4 p-3'}`}>
      {featured ? (
        <>
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-full h-40 object-cover" />
          )}
          <div className="p-4 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{item.name}</p>
              {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
              <p className="font-bold mt-2" style={{ color: branding?.primary_color }}>${Number(item.price).toLocaleString('es-CO')}</p>
            </div>
            <AddToCartButton item={item} tenantId={tenantId} color={branding?.primary_color} />
          </div>
        </>
      ) : (
        <>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{item.name}</p>
            {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
            <p className="font-bold mt-1" style={{ color: branding?.primary_color }}>${Number(item.price).toLocaleString('es-CO')}</p>
          </div>
          <AddToCartButton item={item} tenantId={tenantId} color={branding?.primary_color} />
        </>
      )}
    </div>
  )
}
