import { createClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses } from '@/lib/pageConfig'
import { deriveBrandPalette } from '@/lib/brand-colors'
import AddToCartButton from '@/components/store/AddToCartButton'
import CartBar from '@/components/store/CartBar'
import { MenuGridItem, MenuCompactItem, MenuListItem } from '@/components/store/MenuItems'
import CategoryFilterBar from '@/components/store/CategoryFilterBar'
import type { MenuItem, MenuCategory } from '@/lib/types'
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface MenuProps {
  params: Promise<{ domain: string }>
}

export default async function MenuPage({ params }: MenuProps) {
  try {
    const { domain: tenantSlug } = await params
    const headersList = await headers()
    const hostname = (headersList.get('host') || '').split(':')[0]?.toLowerCase() || ''
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
    const isCustomDomain = Boolean(hostname && !hostname.includes(baseDomain) && !hostname.includes('localhost') && !hostname.endsWith('.vercel.app'))
    const supabase = await createClient()
    const context = await getTenantContext(tenantSlug)
    const tenantId = context.tenant?.id

    if (!tenantId) {
      return <div className="flex items-center justify-center min-h-screen text-gray-500">Restaurante no encontrado</div>
    }

    const [categoriesRes, itemsRes, toppingsRes] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).order('sort_order'),
      supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('available', true)
        .eq('show_in_store', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase.from('product_toppings').select('id, menu_item_id, name, price, sort_order').eq('tenant_id', tenantId).order('sort_order').then(res => res, () => ({ data: [] })),
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
  const storeBasePath = isCustomDomain ? '' : `/${slug}`
  const storeHomePath = storeBasePath || '/'
  const freeToppingsLabel = slug === 'parrillaburgers' ? 'Barra libre' : 'Ingredientes gratis'
  const branding = context.branding
  const settings = context.settings
  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    background: branding?.background_color,
    surface: branding?.section_background_color,
    buttonPrimary: branding?.button_primary_color,
    buttonSecondary: branding?.button_secondary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })
  let primary = palette.primary
  let buttonColor = palette.buttonPrimary
  let priceColor = palette.accent
  let menuTextColor = palette.text
  let menuMutedTextColor = palette.mutedText
  let categoryInactiveColor = palette.buttonSecondary

  // Typography settings from branding
  const headingFontWeight = branding?.heading_font_weight ? parseInt(branding.heading_font_weight as string) : 700
  const bodyFontWeight = branding?.body_font_weight ? parseInt(branding.body_font_weight as string) : 400
  const letterSpacing = (branding?.letter_spacing as number) || 0
  const lineHeight = (branding?.line_height as number) || 1.5
  const textTransform = (branding?.text_transform as string) || 'none'
  const fontFamily = branding?.font_family || 'Inter'
  const buttonHoverEffect = (branding?.button_hover_effect as string) || 'scale'
  const transitionSpeed = (branding?.transition_speed as string) || 'normal'
  const useGradient = branding?.use_gradient || false
  const gradientStart = branding?.gradient_start_color || '#FFFFFF'
  const gradientEnd = branding?.gradient_end_color || '#F3F4F6'
  const gradientDir = branding?.gradient_direction || 'to right'
  const featuredText = (branding as any)?.featured_text?.trim()
  const sectionBackgroundImage = (branding as any)?.section_background_image_url || ''

  const transitionDuration = transitionSpeed === 'slow' ? '500ms' : transitionSpeed === 'fast' ? '100ms' : '300ms'
  const baseBackgroundImage = useGradient
    ? `linear-gradient(${gradientDir}, ${gradientStart}, ${gradientEnd})`
    : undefined
  const pageConfig = getPageConfig((context.tenant as any)?.metadata?.page_config || branding?.page_config)
  const themeMode = pageConfig.appearance.theme_mode
  const isLightTheme = themeMode === 'light'
  const darkGold = '#D4AF37'
  const darkRust = '#D35A37'
  const darkNavy = '#0B0E14'
  const darkPanel = '#1A1F2C'
  const darkMuted = '#8b97a8'
  if (isLightTheme) {
    primary = '#ff5a00'
    buttonColor = '#ff5a00'
    priceColor = '#ff1f1f'
    menuTextColor = '#07111f'
    menuMutedTextColor = 'rgba(7, 17, 31, 0.72)'
    categoryInactiveColor = '#fff3e8'
  } else {
    primary = darkGold
    buttonColor = darkRust
    priceColor = darkGold
    menuTextColor = '#ffffff'
    menuMutedTextColor = darkMuted
    categoryInactiveColor = 'rgba(212, 175, 55, 0.10)'
  }
  const backgroundStyle = useGradient
    ? { backgroundImage: sectionBackgroundImage ? `${baseBackgroundImage}, url(${sectionBackgroundImage})` : baseBackgroundImage, backgroundBlendMode: sectionBackgroundImage ? 'normal, soft-light' : undefined, backgroundSize: sectionBackgroundImage ? 'auto, cover' : undefined, backgroundPosition: sectionBackgroundImage ? 'center, center' : undefined }
    : sectionBackgroundImage
      ? {
          backgroundColor: isLightTheme ? '#ffffff' : darkNavy,
          backgroundImage: isLightTheme
            ? `linear-gradient(rgba(255,255,255,.92), rgba(255,255,255,.97)), url(${sectionBackgroundImage})`
            : `linear-gradient(rgba(11,14,20,.82), rgba(11,14,20,.92)), url(${sectionBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }
      : { backgroundColor: isLightTheme ? '#ffffff' : darkNavy }

  // Get currency from settings or detect from country
  const currencyInfo = settings?.currency
    ? {
        code: settings.currency,
        symbol: settings.currency_symbol || '$',
        locale: (settings.country_code || settings.country) ? getCurrencyByCountry(settings.country_code || settings.country).locale : 'es-ES',
      }
    : getCurrencyByCountry(settings?.country_code || settings?.country || (context.tenant as any)?.country || 'ES')

  const layout = pageConfig.appearance.menu_layout
  const br = getBorderRadius(pageConfig.appearance.border_radius)
  const cardCls = getCardClasses(pageConfig.appearance.card_style)
  const btnCls = getButtonClasses(pageConfig.appearance.button_style)
  const featuredCarousel = featured.length > 1 ? featured : items.slice(0, 8)
  const sectionSurface = isLightTheme ? '#ffffff' : 'rgba(26, 31, 44, 0.78)'
  const cardSurface = isLightTheme ? '#ffffff' : 'rgba(26, 31, 44, 0.82)'
  const sectionBorder = isLightTheme ? 'rgba(255, 90, 0, 0.24)' : 'rgba(212, 175, 55, 0.24)'
  const softSurface = isLightTheme ? 'rgba(255, 90, 0, 0.12)' : 'rgba(212, 175, 55, 0.10)'
  const countTextColor = isLightTheme ? '#ff5a00' : darkGold
  const darkPanelBackground = 'linear-gradient(145deg, rgba(26,31,44,.94) 0%, rgba(17,23,34,.96) 52%, rgba(11,14,20,.98) 100%)'
  const darkButtonSurface = 'linear-gradient(180deg, rgba(212,175,55,.13) 0%, rgba(212,175,55,.07) 100%)'
  const darkRaisedShadow = '0 18px 46px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08)'
  const menuPanelStyle = {
    background: isLightTheme ? sectionSurface : darkPanelBackground,
    borderColor: sectionBorder,
    boxShadow: isLightTheme
      ? '0 18px 42px rgba(15, 23, 42, 0.08)'
      : '0 26px 70px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.08)',
  }
  const headerClass = isLightTheme
    ? 'fixed inset-x-0 top-0 z-[60] border-b border-orange-200/70 bg-white/95 shadow-lg shadow-orange-500/10 backdrop-blur-xl'
    : 'fixed inset-x-0 top-0 z-[60] border-b border-[#D4AF37]/20 bg-[#0B0E14]/95 shadow-lg shadow-black/20 backdrop-blur-xl'
  const headerTextColor = isLightTheme ? '#07111f' : '#ffffff'

  return (
    <div className={`store-surface min-h-screen overflow-x-hidden ${isLightTheme ? 'ecco-store-light' : 'ecco-store-dark'}`} style={{ fontFamily, ...backgroundStyle }}>
      <style>{`
        @keyframes menuRise {
          from { opacity: 0; transform: translateY(18px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .menu-rise { animation: menuRise .52s cubic-bezier(.2,.8,.2,1) both; }
        .store-featured-track {
          display: flex;
          width: max-content;
        }
        .store-featured-track > * {
          flex: 0 0 min(82vw, 24rem);
        }
        @media (min-width: 640px) {
          .store-featured-track > * { flex-basis: 22rem; }
        }
        @media (min-width: 1024px) {
          .store-featured-track > * { flex-basis: 18rem; }
        }
      `}</style>
      {/* Header - Professional */}
      <header className={headerClass} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:h-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {context.tenant?.logo_url && (
              <div className="relative flex h-10 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white sm:h-12 sm:w-20">
                <Image
                  src={context.tenant.logo_url}
                  alt=""
                  width={96}
                  height={64}
                  className="relative max-h-full max-w-full object-contain drop-shadow-sm"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1
                className="truncate text-sm sm:text-base"
                style={{
                  color: headerTextColor,
                  fontWeight: headingFontWeight,
                  letterSpacing: `${letterSpacing}em`,
                  textTransform: textTransform as any,
                  lineHeight: lineHeight,
                }}
              >
                {branding?.app_name || context.tenant?.organization_name}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Menú</p>
            </div>
          </div>
          <Link href={`${storeBasePath}/carrito`} className="relative flex-shrink-0 rounded-xl border p-2 transition-all hover:bg-white/14 active:bg-white/20 sm:p-2.5" style={{ borderColor: isLightTheme ? 'rgba(255,90,0,.32)' : 'rgba(231,180,63,.25)', backgroundColor: isLightTheme ? 'rgba(255,90,0,.10)' : 'rgba(255,255,255,.08)' }} title="Carrito">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLightTheme ? '#07111f' : buttonColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </Link>
        </div>

        <CategoryFilterBar
          categories={categories}
          primary={buttonColor}
          activeTextColor={isLightTheme ? '#07111f' : '#ffffff'}
          inactiveTextColor={isLightTheme ? menuTextColor : darkMuted}
          borderColor={sectionBorder}
          inactiveColor={categoryInactiveColor}
          activeColor={isLightTheme ? undefined : darkRust}
          buttonShadow={isLightTheme ? undefined : darkRaisedShadow}
          btnCls={btnCls}
        />
      </header>

      <main id="top" className="mx-auto max-w-7xl space-y-5 px-3 pb-32 pt-[122px] sm:space-y-8 sm:px-6 sm:pb-36 sm:pt-[132px] lg:px-8">
        <section className="menu-rise overflow-hidden rounded-[22px] border p-4 sm:rounded-[28px] sm:p-7" style={menuPanelStyle}>
          <p className="text-xs font-black uppercase" style={{ color: priceColor }}>Carta digital</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight sm:text-4xl" style={{ color: menuTextColor }}>Elige tu pedido</h1>
              <p className="mt-2 max-w-2xl break-words text-sm font-bold leading-6" style={{ color: menuMutedTextColor }}>Explora los productos del restaurante y agrega tus favoritos al carrito.</p>
              {featuredText && (
                <div className="mt-4 max-w-2xl rounded-2xl border px-4 py-3 text-sm font-black leading-6" style={{ borderColor: `${priceColor}33`, backgroundColor: isLightTheme ? `${priceColor}12` : 'rgba(255,255,255,.045)', color: priceColor }}>
                  {featuredText}
                </div>
              )}
            </div>
            <Link href={storeHomePath} className="inline-flex h-11 w-full items-center justify-center rounded-full border px-5 text-sm font-black transition hover:-translate-y-0.5 active:translate-y-0.5 sm:w-auto" style={{ color: buttonColor, borderColor: `${buttonColor}40`, background: isLightTheme ? softSurface : darkButtonSurface, boxShadow: isLightTheme ? undefined : darkRaisedShadow }}>
              Volver al inicio
            </Link>
          </div>
        </section>
        {/* Featured - Professional */}
        {featuredCarousel.length > 0 && (
          <section className="menu-rise relative scroll-mt-28 rounded-[22px] border p-4 sm:rounded-[28px] sm:p-7" data-featured style={{ ...menuPanelStyle, animationDelay: '80ms' }}>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-1 h-5 sm:h-6 rounded-full" style={{ backgroundColor: buttonColor }} />
              <h2
                  className="text-base sm:text-lg"
                  style={{
                   color: menuTextColor,
                   fontWeight: headingFontWeight,
                   letterSpacing: `${letterSpacing}em`,
                   textTransform: textTransform as any,
                  lineHeight: lineHeight,
                }}
              >
                ⭐ Lo más pedido
              </h2>
            </div>
            <div className="store-featured-carousel -mx-2 overflow-x-auto px-2 pb-2 scrollbar-hide">
              <div className="store-featured-track flex gap-4">
                {featuredCarousel.map((item, index) => (
                <div
                  key={item.id}
                  className={`menu-rise group flex flex-col overflow-hidden border shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${cardCls}`}
                  style={{
                    borderRadius: br,
                    backgroundColor: cardSurface,
                    borderColor: sectionBorder,
                    animationDelay: `${120 + (index % Math.max(featuredCarousel.length, 1)) * 45}ms`,
                    backgroundImage: isLightTheme ? `linear-gradient(135deg, ${primary}12, transparent 60%)` : 'linear-gradient(145deg, rgba(26,31,44,.90), rgba(11,14,20,.96))',
                    boxShadow: isLightTheme ? undefined : '0 18px 40px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08)',
                  }}
                >
                  {item.image_url ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.03]">
                      <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/10 to-transparent" />
                      <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-3 py-1.5 text-sm font-black shadow-lg backdrop-blur" style={{ color: priceColor }}>
                        {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
                      </span>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-4xl" style={{ background: `linear-gradient(135deg, ${primary}22, ${priceColor}18)` }}>🍽️</div>
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 min-h-10 text-sm font-black leading-5" style={{ color: menuTextColor }}>{item.name}</p>
                    {item.description && <p className="mt-1 line-clamp-2 flex-1 text-xs font-semibold" style={{ color: menuMutedTextColor }}>{item.description}</p>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className={`text-base font-black ${item.image_url ? 'sr-only' : ''}`} style={{ color: priceColor }}>{formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}</p>
                      <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small toppings={toppingsByItem[item.id] || []} currencyInfo={currencyInfo} freeToppingsLabel={freeToppingsLabel} />
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </div>
            {featuredCarousel.length > 1 && (
              <div className="pointer-events-none absolute right-5 top-[50%] z-10 flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black backdrop-blur-md sm:right-7" style={{ borderColor: isLightTheme ? 'rgba(255,31,31,.24)' : `${buttonColor}55`, background: isLightTheme ? 'linear-gradient(135deg, rgba(255,255,255,.92), rgba(236,253,245,.82))' : darkButtonSurface, color: isLightTheme ? '#221106' : buttonColor, boxShadow: isLightTheme ? undefined : darkRaisedShadow }}>
                <span>Desliza</span>
                <span className="text-lg leading-none" aria-hidden="true">→</span>
              </div>
            )}
          </section>
        )}

        {/* By category */}
        {categories.map((cat, catIndex) => {
          const catItems = itemsByCategory[cat.id] || []
          if (catItems.length === 0) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`} data-category={cat.id} className="menu-rise scroll-mt-28 rounded-[22px] border p-4 sm:rounded-[28px] sm:p-7" style={{ ...menuPanelStyle, animationDelay: `${120 + catIndex * 55}ms` }}>
              <h2
                className="mb-3 flex items-center justify-between text-base"
                style={{
                  color: menuTextColor,
                  fontWeight: headingFontWeight,
                  letterSpacing: `${letterSpacing}em`,
                  textTransform: textTransform as any,
                  lineHeight: lineHeight,
                }}
              >
                {cat.name}
                <span className="rounded-full border px-3 py-1 text-xs font-black" style={{ backgroundColor: softSurface, borderColor: isLightTheme ? 'transparent' : `${primary}40`, color: countTextColor }}>{catItems.length}</span>
              </h2>
              {layout === 'grid' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {catItems.map((item, index) => (
                    <MenuGridItem key={item.id} item={item} tenantId={tenantId} primary={primary} priceColor={priceColor} buttonColor={buttonColor} textColor={menuTextColor} mutedTextColor={menuMutedTextColor} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} freeToppingsLabel={freeToppingsLabel} index={index} />
                  ))}
                </div>
              ) : layout === 'compact' ? (
                <div className={`overflow-hidden divide-y divide-gray-50 ${cardCls}`} style={{ borderRadius: br }}>
                  {catItems.map((item, index) => (
                    <MenuCompactItem key={item.id} item={item} tenantId={tenantId} primary={primary} priceColor={priceColor} buttonColor={buttonColor} textColor={menuTextColor} mutedTextColor={menuMutedTextColor} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} freeToppingsLabel={freeToppingsLabel} index={index} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {catItems.map((item, index) => (
                    <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} priceColor={priceColor} buttonColor={buttonColor} textColor={menuTextColor} mutedTextColor={menuMutedTextColor} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} freeToppingsLabel={freeToppingsLabel} index={index} />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* Uncategorized */}
        {uncategorized.length > 0 && (
          <section className="menu-rise scroll-mt-28 rounded-[22px] border p-4 sm:rounded-[28px] sm:p-7" style={menuPanelStyle}>
            <h2
              className="mb-3 text-base"
              style={{
                color: menuTextColor,
                fontWeight: headingFontWeight,
                letterSpacing: `${letterSpacing}em`,
                textTransform: textTransform as any,
                lineHeight: lineHeight,
              }}
            >
              Otros
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {uncategorized.map((item, index) => (
                <MenuListItem key={item.id} item={item} tenantId={tenantId} primary={primary} priceColor={priceColor} buttonColor={buttonColor} textColor={menuTextColor} mutedTextColor={menuMutedTextColor} br={br} cardCls={cardCls} currencyInfo={currencyInfo} toppings={toppingsByItem[item.id] || []} freeToppingsLabel={freeToppingsLabel} index={index} />
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

      <CartBar tenantId={slug} primaryColor={buttonColor} currencyInfo={currencyInfo} basePath={storeBasePath} themeMode={themeMode} />
    </div>
  )
  } catch (error) {
    console.error('MenuPage error:', error)
    return <div className="flex items-center justify-center min-h-screen text-red-600">Error al cargar el menú. Por favor, intenta más tarde.</div>
  }
}

