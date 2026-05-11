import Image from 'next/image'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { deriveBrandPalette, readableTextColor } from '@/lib/brand-colors'
import type { MenuCategory, MenuItem } from '@/lib/types'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import QrCategoryNav from '@/components/store/QrCategoryNav'
import { normalizeLocale, translate } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CartaProps {
  params: Promise<{ domain: string }>
}

type Topping = {
  id: string
  menu_item_id: string
  name: string
  price: number
  is_required?: boolean
  sort_order?: number
}

export default async function CartaPage({ params }: CartaProps) {
  const { domain: tenantSlug } = await params
  const cookieStore = await cookies()
  const locale = normalizeLocale(cookieStore.get('eccofood_locale')?.value)
  const tr = (key: string) => translate(locale, key)
  const supabase = await createClient()
  const context = await getTenantContext(tenantSlug)
  const tenantId = context.tenant?.id

  if (!tenantId) {
    return <div className="grid min-h-screen place-items-center bg-white text-sm font-black text-black/55">{tr('store.notFound')}</div>
  }

  const [categoriesRes, itemsRes, toppingsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
    supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true).order('featured', { ascending: false }).order('name'),
    supabase
      .from('product_toppings')
      .select('id, menu_item_id, name, price, sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .then(res => res, () => ({ data: [] as Topping[] })),
  ])

  const allCategories: MenuCategory[] = categoriesRes.data || []
  const items: MenuItem[] = itemsRes.data || []
  const toppings = (toppingsRes.data || []) as Topping[]
  const toppingsByItem = new Map<string, Topping[]>()
  const itemCategoryIds = new Set<string>()

  toppings.forEach((topping) => {
    const list = toppingsByItem.get(topping.menu_item_id) || []
    list.push(topping)
    toppingsByItem.set(topping.menu_item_id, list)
  })

  items.forEach((item) => {
    if (item.category_id) itemCategoryIds.add(item.category_id)
  })

  const categories = allCategories.filter(category => itemCategoryIds.has(category.id))
  const featured = items.filter(item => item.featured)
  const uncategorized = items.filter(item => !item.category_id)
  const itemsByCategory = new Map<string, MenuItem[]>()

  items.forEach((item) => {
    if (!item.category_id) return
    const list = itemsByCategory.get(item.category_id) || []
    list.push(item)
    itemsByCategory.set(item.category_id, list)
  })

  const branding = context.branding
  const settings = context.settings
  const tenant = context.tenant
  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    surface: branding?.section_background_color,
    buttonPrimary: branding?.button_primary_color,
    buttonSecondary: branding?.button_secondary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })
  const { primary, secondary, accent, background, cardSurface, neutralSoft, buttonPrimary, buttonPrimaryText, buttonSecondary, text: surfaceText, mutedText, border } = palette
  const headerText = readableTextColor(primary)
  const headerMutedText = `${headerText}b3`
  const chipInactiveText = readableTextColor(buttonSecondary, surfaceText)
  const heroText = readableTextColor(secondary)
  const fontFamily = branding?.font_family || 'Inter, system-ui, sans-serif'
  const currencyInfo = settings?.currency
    ? {
        code: settings.currency,
        symbol: settings.currency_symbol || '$',
        locale: getCurrencyByCountry(settings.country_code || settings.country || 'ES').locale,
      }
    : getCurrencyByCountry(settings?.country_code || settings?.country || (tenant as any)?.country || 'ES')

  const restaurantName = branding?.app_name || tenant?.organization_name || 'Restaurante'
  const logoUrl = branding?.logo_url || tenant?.logo_url
  const visibleProducts = items.length
  const visibleCategories = categories.length + (featured.length > 0 ? 1 : 0) + (uncategorized.length > 0 ? 1 : 0)
  const sectionBackgroundImage = (branding as any)?.section_background_image_url || ''
  const pageBackgroundImage = sectionBackgroundImage
    ? `linear-gradient(${background}e8, ${background}e8), url(${sectionBackgroundImage})`
    : `radial-gradient(circle at top left, ${primary}18, transparent 32rem), radial-gradient(circle at top right, ${secondary}14, transparent 28rem)`

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        backgroundColor: background,
        fontFamily,
        backgroundImage: pageBackgroundImage,
        backgroundSize: sectionBackgroundImage ? 'cover, cover, auto, auto' : undefined,
        backgroundPosition: sectionBackgroundImage ? 'center, center, top left, top right' : undefined,
      }}
    >
      <header className="fixed inset-x-0 top-0 z-40 border-b shadow-lg shadow-black/[0.08] backdrop-blur-xl" style={{ backgroundColor: primary, borderColor: `${headerText}24` }}>
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          {logoUrl ? (
            <div className="relative h-16 w-24 flex-shrink-0">
              <Image src={logoUrl} alt={restaurantName} fill sizes="96px" className="object-contain drop-shadow-xl" priority />
            </div>
          ) : (
            <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-lg font-black" style={{ backgroundColor: primary, color: readableTextColor(primary) }}>
              {restaurantName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black" style={{ color: headerText }}>{restaurantName}</p>
            <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: headerMutedText }}>{tr('qr.digitalMenu')}</p>
          </div>
          <LanguageSwitcher compact reloadOnChange className="border-white/20 bg-white/90" />
        </div>

        {categories.length > 0 && (
          <QrCategoryNav
            categories={categories}
            showFeatured={featured.length > 0}
            featuredLabel={tr('qr.mostOrdered')}
            activeColor={buttonPrimary}
            activeTextColor={buttonPrimaryText}
            inactiveColor={buttonSecondary}
            inactiveTextColor={chipInactiveText}
            borderColor={border}
          />
        )}
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-5 pt-[7.25rem]">
        <div className="overflow-hidden rounded-[2rem] border shadow-2xl shadow-black/10" style={{ backgroundColor: secondary, borderColor: `${primary}33` }}>
          <div className="relative min-h-[220px] p-5 sm:p-7">
            {branding?.hero_image_url && (
              <Image
                src={branding.hero_image_url}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-32"
                priority
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-black/18 via-transparent to-black/20" />
            <div className="relative z-10 flex min-h-[170px] flex-col justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: `${heroText}99` }}>{tr('qr.tableMenu')}</p>
                <h1 className="mt-3 max-w-sm text-[2.2rem] font-black leading-[1.02] sm:text-5xl sm:leading-[0.95]" style={{ color: heroText }}>
                  {tr('qr.heroTitle')}
                </h1>
                <p className="mt-4 max-w-md text-base font-bold leading-7" style={{ color: `${heroText}c7` }}>
                  {tr('qr.heroSubtitle')}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/18 bg-white/12 px-3 py-2 backdrop-blur">
                  <p className="text-xl font-black leading-none" style={{ color: heroText }}>{visibleProducts}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: `${heroText}9f` }}>{tr('qr.products')}</p>
                </div>
                <div className="rounded-2xl border border-white/18 bg-white/12 px-3 py-2 backdrop-blur">
                  <p className="text-xl font-black leading-none" style={{ color: heroText }}>{visibleCategories}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: `${heroText}9f` }}>{tr('qr.sections')}</p>
                </div>
                <div className="rounded-2xl border border-white/18 bg-white/12 px-3 py-2 backdrop-blur">
                  <p className="text-xl font-black leading-none" style={{ color: heroText }}>QR</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: `${heroText}9f` }}>{tr('qr.alwaysActive')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        {featured.length > 0 && (
          <section id="destacados" className="scroll-mt-36 rounded-[1.75rem] border p-4 shadow-xl shadow-black/[0.05] sm:p-5" style={{ backgroundColor: cardSurface, borderColor: border }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: mutedText }}>{tr('qr.recommended')}</p>
                <h2 className="text-2xl font-black" style={{ color: surfaceText }}>{tr('qr.mostOrdered')}</h2>
              </div>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <div className="grid gap-3">
              {featured.map(item => (
                <CartaItem
                  key={item.id}
                  item={item}
                  toppings={toppingsByItem.get(item.id) || []}
                  colors={{ primary, accent, surface: neutralSoft, cardSurface, surfaceText, mutedText, border, buttonPrimary, buttonPrimaryText }}
                  currencyInfo={currencyInfo}
                />
              ))}
            </div>
          </section>
        )}

        {categories.map(category => {
          const categoryItems = itemsByCategory.get(category.id) || []
          if (categoryItems.length === 0) return null
          return (
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-36 rounded-[1.75rem] border p-4 shadow-xl shadow-black/[0.05] sm:p-5" style={{ backgroundColor: cardSurface, borderColor: border }}>
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: mutedText }}>{tr('qr.category')}</p>
                <h2 className="text-3xl font-black tracking-tight" style={{ color: surfaceText }}>{category.name}</h2>
                {category.description && <p className="mt-1 text-sm font-semibold leading-6" style={{ color: mutedText }}>{category.description}</p>}
              </div>
              <div className="grid gap-3">
                {categoryItems.map(item => (
                  <CartaItem
                    key={item.id}
                    item={item}
                    toppings={toppingsByItem.get(item.id) || []}
                    colors={{ primary, accent, surface: neutralSoft, cardSurface, surfaceText, mutedText, border, buttonPrimary, buttonPrimaryText }}
                    currencyInfo={currencyInfo}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {uncategorized.length > 0 && (
          <section className="rounded-[1.75rem] border p-4 shadow-xl shadow-black/[0.05] sm:p-5" style={{ backgroundColor: cardSurface, borderColor: border }}>
            <h2 className="mb-4 text-2xl font-black" style={{ color: surfaceText }}>{tr('qr.otherProducts')}</h2>
            <div className="grid gap-3">
              {uncategorized.map(item => (
                <CartaItem
                  key={item.id}
                  item={item}
                  toppings={toppingsByItem.get(item.id) || []}
                  colors={{ primary, accent, surface: neutralSoft, cardSurface, surfaceText, mutedText, border, buttonPrimary, buttonPrimaryText }}
                  currencyInfo={currencyInfo}
                />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="rounded-[1.5rem] p-8 text-center shadow-xl shadow-black/[0.04]" style={{ backgroundColor: cardSurface }}>
            <p className="text-lg font-black" style={{ color: surfaceText }}>Carta sin productos visibles</p>
            <p className="mt-2 text-sm font-semibold" style={{ color: mutedText }}>Activa productos desde el panel para mostrarlos aqui.</p>
          </div>
        )}
      </div>
    </main>
  )
}

function CartaItem({
  item,
  toppings,
  colors,
  currencyInfo,
}: {
  item: MenuItem
  toppings: Topping[]
  colors: {
    primary: string
    accent: string
    surface: string
    cardSurface: string
    surfaceText: string
    mutedText: string
    border: string
    buttonPrimary: string
    buttonPrimaryText: string
  }
  currencyInfo: { code: string; locale: string }
}) {
  const priceText = readableTextColor(colors.accent)

  return (
    <article
      className="group relative min-h-[220px] overflow-hidden rounded-[1.7rem] border shadow-xl shadow-black/[0.08] transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
      style={{
        backgroundColor: colors.cardSurface,
        borderColor: `${colors.border}cc`,
        backgroundImage: `linear-gradient(135deg, ${colors.primary}18, transparent 62%)`,
      }}
    >
      <div className="absolute inset-0">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-7xl font-black" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: readableTextColor(colors.primary) }}>
            {item.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/34 to-black/8" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.primary}aa, transparent 52%)` }} />
      <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {toppings.length > 0 && (
            <span className="rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] shadow-lg" style={{ backgroundColor: `${colors.buttonPrimary}e8`, color: colors.buttonPrimaryText }}>
              Adicionales
            </span>
          )}
          {item.featured && (
            <span className="rounded-full bg-white/18 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/20 backdrop-blur">
              Recomendado
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-2xl font-black leading-[1.05] text-white sm:text-3xl">{item.name}</h3>
            {item.description && (
              <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-5 text-white/78 sm:text-[15px]">{item.description}</p>
            )}
          </div>
          <p className="shrink-0 rounded-2xl px-3.5 py-2 text-lg font-black leading-none shadow-xl" style={{ backgroundColor: colors.accent, color: priceText }}>
            {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
          </p>
        </div>
        {toppings.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {toppings.slice(0, 4).map(topping => (
              <span key={topping.id} className="rounded-full bg-white/16 px-2.5 py-1.5 text-[11px] font-black text-white/82 ring-1 ring-white/18 backdrop-blur">
                {topping.name}{Number(topping.price || 0) > 0 ? ` +${formatPriceWithCurrency(Number(topping.price), currencyInfo.code, currencyInfo.locale)}` : ''}
              </span>
            ))}
            {toppings.length > 4 && (
              <span className="rounded-full bg-white/16 px-2.5 py-1.5 text-[11px] font-black text-white/82 ring-1 ring-white/18 backdrop-blur">
                +{toppings.length - 4} mas
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
