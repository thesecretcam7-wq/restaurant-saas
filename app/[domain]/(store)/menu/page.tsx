import { createClient } from '@/lib/supabase/server'
import { formatPrice, formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses } from '@/lib/pageConfig'
import AddToCartButton from '@/components/store/AddToCartButton'
import CartBar from '@/components/store/CartBar'
import Link from 'next/link'

interface MenuProps {
  params: Promise<{ domain: string }>
}

export default async function MenuPage({ params }: MenuProps) {
  const { domain: tenantId } = await params
  const supabase = await createClient()
  const context = await getTenantContext(tenantId)

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
    supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true).order('featured', { ascending: false }),
  ])

  const categories = categoriesRes.data || []
  const items = itemsRes.data || []
  const tenantSlug = context.tenant?.slug || tenantId
  const branding = context.branding
  const settings = context.settings
  const primary = branding?.primary_color || '#3B82F6'
  const featured = items.filter(i => i.featured)

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
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {context.tenant?.logo_url && (
              <div className="relative">
                <div className="absolute inset-0 scale-110 rounded-full opacity-10" style={{ backgroundColor: primary }} />
                <img src={context.tenant.logo_url} alt="" className="w-10 h-10 object-cover relative shadow-sm" style={{ borderRadius: `calc(${br} * 0.5)` }} />
              </div>
            )}
            <div>
              <h1 className="font-black text-gray-900 text-base tracking-tight">
                {branding?.app_name || context.tenant?.organization_name}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Menú</p>
            </div>
          </div>
          <Link href={`/${tenantSlug}/carrito`} className="relative p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-all" title="Carrito">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </Link>
        </div>

        {/* Category pills - Professional */}
        {categories.length > 0 && (
          <div className="max-w-lg mx-auto flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide border-b border-gray-100">
            <a
              href="#top"
              className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-full transition-all shadow-sm hover:shadow-md active:scale-95 ${btnCls}`}
              style={{ backgroundColor: primary, color: '#fff' }}
            >
              Todo
            </a>
            {categories.map(cat => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className={`px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-full bg-white border transition-all hover:border-current ${btnCls}`}
                style={{ borderColor: `${primary}40`, color: primary }}
              >
                {cat.name}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top" className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {/* Featured - Professional */}
        {featured.length > 0 && (
          <section className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: primary }} />
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                ⭐ Lo más pedido
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                      <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* By category */}
        {categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id)
          if (catItems.length === 0) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-28">
              <h2 className="text-base font-extrabold text-gray-900 mb-3 flex items-center justify-between">
                {cat.name}
                <span className="text-xs font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{catItems.length}</span>
              </h2>
              {layout === 'grid' ? (
                <div className="grid grid-cols-2 gap-3">
                  {catItems.map(item => (
                    <MenuGridItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                  ))}
                </div>
              ) : layout === 'compact' ? (
                <div className={`overflow-hidden divide-y divide-gray-50 ${cardCls}`} style={{ borderRadius: br }}>
                  {catItems.map(item => (
                    <MenuCompactItem key={item.id} item={item} tenantId={tenantId} primary={primary} currencyInfo={currencyInfo} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {catItems.map(item => (
                    <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* Uncategorized */}
        {(() => {
          const uncategorized = items.filter(i => !i.category_id && !i.featured)
          if (uncategorized.length === 0) return null
          return (
            <section>
              <h2 className="text-base font-extrabold text-gray-900 mb-3">Otros</h2>
              <div className="space-y-2.5">
                {uncategorized.map(item => (
                  <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} br={br} cardCls={cardCls} currencyInfo={currencyInfo} />
                ))}
              </div>
            </section>
          )
        })()}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-gray-500 font-medium">El menú aún no está disponible</p>
            <p className="text-muted-foreground text-sm mt-1">Vuelve pronto</p>
          </div>
        )}
      </main>

      <CartBar tenantId={tenantSlug} primaryColor={primary} />
    </div>
  )
}

/* ─── LIST layout (default) ─── */
function MenuListItem({ item, tenantId, primary, br, cardCls, currencyInfo }: { item: any; tenantId: string; primary: string; br: string; cardCls: string; currencyInfo: any }) {
  return (
    <div className={`flex items-center gap-3 p-3 overflow-hidden ${cardCls}`} style={{ borderRadius: br }}>
      {item.image_url ? (
        <div className="relative flex-shrink-0">
          <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover" style={{ borderRadius: `calc(${br} * 0.6)` }} />
        </div>
      ) : (
        <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center text-3xl" style={{ backgroundColor: `${primary}10`, borderRadius: `calc(${br} * 0.6)` }}>
          🍽️
        </div>
      )}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
        <p className="font-extrabold text-sm mt-1.5" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
      </div>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
      </div>
    </div>
  )
}

/* ─── GRID layout ─── */
function MenuGridItem({ item, tenantId, primary, br, cardCls, currencyInfo }: { item: any; tenantId: string; primary: string; br: string; cardCls: string; currencyInfo: any }) {
  return (
    <div className={`overflow-hidden flex flex-col ${cardCls}`} style={{ borderRadius: br }}>
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="h-28 flex items-center justify-center text-3xl" style={{ backgroundColor: `${primary}10` }}>🍽️</div>
      )}
      <div className="p-2.5 flex flex-col flex-1">
        <p className="font-bold text-gray-900 text-xs line-clamp-1">{item.name}</p>
        {item.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 flex-1">{item.description}</p>}
        <div className="flex items-center justify-between mt-2 gap-1">
          <p className="font-extrabold text-sm" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
          <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
        </div>
      </div>
    </div>
  )
}

/* ─── COMPACT layout ─── */
function MenuCompactItem({ item, tenantId, primary, currencyInfo }: { item: any; tenantId: string; primary: string; currencyInfo: any }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
        {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
      </div>
      <p className="font-extrabold text-sm flex-shrink-0" style={{ color: primary }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
      <div className="flex-shrink-0">
        <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
      </div>
    </div>
  )
}
