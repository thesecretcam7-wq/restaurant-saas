import { createServiceClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { deriveBrandPalette } from '@/lib/brand-colors'
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
          <a href="/" className="font-semibold text-gray-900 hover:underline">Volver al inicio</a>
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
  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    surface: branding?.section_background_color,
    buttonPrimary: branding?.button_primary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })
  const primary = palette.primary
  const sectionBackgroundImage = (branding as any)?.section_background_image_url || ''
  const pageBackgroundStyle = sectionBackgroundImage
    ? {
        backgroundColor: palette.background,
        backgroundImage: `linear-gradient(rgba(255,255,255,.78), rgba(255,255,255,.78)), url(${sectionBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : { backgroundColor: palette.background }
  const countryCurrency = getCurrencyByCountry(context.settings?.country_code || context.settings?.country || (context.tenant as any)?.country || 'ES')
  const currencyInfo = context.settings?.currency
    ? { ...countryCurrency, code: context.settings.currency, symbol: context.settings.currency_symbol || countryCurrency.symbol }
    : countryCurrency

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Categoría No Encontrada</h1>
          <a href={`/${context.tenant?.slug || domain}`} className="font-semibold hover:underline" style={{ color: primary }}>Volver al menú</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <a href={`/${context.tenant?.slug || domain}`} className="text-2xl">←</a>
            <a href={`/${context.tenant?.slug || domain}/carrito`} className="relative p-2">
              <span className="text-xl">🛒</span>
            </a>
          </div>
          <div>
            <h1 className="font-bold text-2xl" style={{ color: primary }}>
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
              <MenuItemCard key={item.id} item={item} tenantSlug={context.tenant?.slug || domain} palette={palette} currencyInfo={currencyInfo} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function MenuItemCard({ item, tenantSlug, palette, currencyInfo }: { item: any; tenantSlug: string; palette: ReturnType<typeof deriveBrandPalette>; currencyInfo: { code: string; locale: string } }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden flex items-center gap-4 p-3 shadow-sm hover:shadow-xl transition-shadow"
      style={{
        backgroundColor: palette.cardSurface,
        borderColor: palette.border,
        backgroundImage: `linear-gradient(135deg, ${palette.primary}12, transparent 58%)`,
      }}
    >
      {item.image_url ? (
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl">
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="w-24 h-24 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${palette.primary}22, ${palette.accent}18)` }}>🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: palette.text }}>{item.name}</p>
        {item.description && <p className="text-sm mt-0.5 line-clamp-2" style={{ color: palette.mutedText }}>{item.description}</p>}
        <p className="font-bold mt-2" style={{ color: palette.accent }}>
          {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
        </p>
      </div>
      <AddToCartButton item={item} tenantId={tenantSlug} color={palette.buttonPrimary} />
    </div>
  )
}
