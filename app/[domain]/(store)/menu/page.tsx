import { createClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses } from '@/lib/pageConfig'
import AddToCartButton from '@/components/store/AddToCartButton'
import CartBar from '@/components/store/CartBar'
import { MenuGridItem, MenuCompactItem, MenuListItem } from '@/components/store/MenuItems'
import CategoryFilterBar from '@/components/store/CategoryFilterBar'
import type { MenuItem, MenuCategory } from '@/lib/types'
import Link from 'next/link'

export const revalidate = 60 // Cache for 1 minute, then revalidate

interface MenuProps {
  params: Promise<{ domain: string }>
}

export default async function MenuPage({ params }: MenuProps) {
  try {
    const { domain: tenantSlug } = await params
    const supabase = await createClient()
    const context = await getTenantContext(tenantSlug)
    const tenantId = context.tenant?.id

    if (!tenantId) {
      return <div className="flex items-center justify-center min-h-screen text-gray-500">Restaurante no encontrado</div>
    }

    const [categoriesRes, itemsRes, toppingsRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true).order('featured', { ascending: false }),
      supabase.from('product_toppings').select('id, menu_item_id, name, price, is_required, sort_order').eq('tenant_id', tenantId).order('sort_order').then(res => res, () => ({ data: [] })),
    ])

    if (categoriesRes.error) {
      console.error('Error fetching categories:', categoriesRes.error)
      throw new Error(`Failed to fetch categories: ${categoriesRes.error.message}`)
    }

    if (itemsRes.error) {
      console.error('Error fetching items:', itemsRes.error)
      throw new Error(`Failed to fetch items: ${itemsRes.error.message}`)
    }

  const allCategories: MenuCategory[] = categoriesRes.data || []
  const items: MenuItem[] = itemsRes.data || []
  const allToppings = toppingsRes.data || []

  // Build maps for O(1) lookups instead of O(n) filters
  const toppingsByItem: { [itemId: string]: typeof allToppings } = {}
  const itemCategoryIds = new Set<string>()

  allToppings.forEach(topping => {
    if (!toppingsByItem[topping.menu_item_id]) {
      toppingsByItem[topping.menu_item_id] = []
    }
    toppingsByItem[topping.menu_item_id].push(topping)
  })

  items.forEach(item => {
    if (item.category_id) itemCategoryIds.add(item.category_id)
  })

  const categories = allCategories.filter(cat => itemCategoryIds.has(cat.id))

  // Pre-compute item groupings for efficiency
  const itemsByCategory: { [catId: string]: MenuItem[] } = {}
  const featured: MenuItem[] = []
  const uncategorized: MenuItem[] = []

  items.forEach(item => {
    if (item.featured) featured.push(item)
    if (item.category_id) {
      if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = []
      itemsByCategory[item.category_id].push(item)
    } else if (!item.featured) {
      uncategorized.push(item)
    }
  })

  const slug = context.tenant?.slug || tenantSlug
  const branding = context.branding
  const settings = context.settings
  const primary = branding?.primary_color || '#4F46E5'

  // Get currency from settings or detect from country
  const currencyInfo = settings?.currency
    ? {
        code: settings.currency,
        symbol: settings.currency_symbol || '$',
        locale: settings.country_code ? getCurrencyByCountry(settings.country_code).locale : 'es-CO',
      }
    : getCurrencyByCountry(settings?.country_code || 'CO')

  const pageConfig = getPageConfig(branding?.page_config)
  const layout = pageConfig.appearance.menu_layout
  const br = getBorderRadius(pageConfig.appearance.border_radius)
  const cardCls = getCardClasses(pageConfig.appearance.card_style)
  const btnCls = getButtonClasses(pageConfig.appearance.button_style)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Professional */}
      <header className="sticky top-0 z-20 bg-white/98 backdrop-blur-xl shadow-md border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {context.tenant?.logo_url && (
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 scale-110 rounded-full opacity-10" style={{ backgroundColor: primary }} />
                <img src={context.tenant.logo_url} alt="" className="w-9 sm:w-10 h-9 sm:h-10 object-cover relative shadow-sm" style={{ borderRadius: `calc(${br} * 0.5)` }} />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-black text-gray-900 text-sm sm:text-base tracking-tight truncate">
                {branding?.app_name || context.tenant?.organization_name}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Menú</p>
            </div>
          </div>
          <Link href={`/${slug}/carrito`} className="relative p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-all flex-shrink-0" title="Carrito">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </Link>
        </div>

        <CategoryFilterBar categories={categories} primary={primary} btnCls={btnCls} />
      </header>

      <main id="top" className="max-w-lg mx-auto px-4 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Featured - Professional */}
        {featured.length > 0 && (
          <section className="scroll-mt-20" data-featured>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-1 h-5 sm:h-6 rounded-full" style={{ backgroundColor: primary }} />
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                ⭐ Lo más pedido
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {featured.map(item => (
                <div key={item.id} className={`overflow-hidden flex flex-col ${cardCls}`} style={{ borderRadius: br }}>
                  {item.image_url ? (
                    <div className="relative overflow-hidden h-32">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-4xl" style={{ backgroundColor: `${primary}10` }}>🍽️</div>
                  )}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.description}</p>}
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <p className="font-extrabold text-sm" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
                      <AddToCartButton item={item} tenantId={tenantId} color={primary} small toppings={toppingsByItem[item.id] || []} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By category */}
        {categories.map(cat => {
          const catItems = itemsByCategory[cat.id] || []
          if (catItems.length === 0) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`} data-category={cat.id} className="scroll-mt-28">
              <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center justify-between">
                {cat.name}
                <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{catItems.length}</span>
              </h2>
              {layout === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {catItems.map(item => (
                    <MenuGridItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} />
                  ))}
                </div>
              ) : layout === 'compact' ? (
                <div className={`overflow-hidden divide-y divide-gray-50 ${cardCls}`} style={{ borderRadius: br }}>
                  {catItems.map(item => (
                    <MenuCompactItem key={item.id} item={item} tenantId={tenantId} primary={primary} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {catItems.map(item => (
                    <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="text-base font-extrabold text-gray-900 mb-3">Otros</h2>
            <div className="space-y-2.5">
              {uncategorized.map(item => (
                <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-gray-500 font-medium">El menú aún no está disponible</p>
            <p className="text-muted-foreground text-sm mt-1">Vuelve pronto</p>
          </div>
        )}
      </main>

      <CartBar tenantId={slug} primaryColor={primary} />
    </div>
  )
  } catch (error) {
    console.error('MenuPage error:', error)
    return <div className="flex items-center justify-center min-h-screen text-red-600">Error al cargar el menú. Por favor, intenta más tarde.</div>
  }
}

