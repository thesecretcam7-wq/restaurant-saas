import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import type { MenuCategory, MenuItem } from '@/lib/types'

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

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function isDark(hex: string) {
  const rgb = hexToRgb(hex)
  if (!rgb) return false
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 < 0.55
}

function readableText(background: string, dark = '#15130f', light = '#ffffff') {
  return isDark(background) ? light : dark
}

export default async function CartaPage({ params }: CartaProps) {
  const { domain: tenantSlug } = await params
  const supabase = await createClient()
  const context = await getTenantContext(tenantSlug)
  const tenantId = context.tenant?.id

  if (!tenantId) {
    return <div className="grid min-h-screen place-items-center bg-white text-sm font-black text-black/55">Restaurante no encontrado</div>
  }

  const [categoriesRes, itemsRes, toppingsRes] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
    supabase.from('menu_items').select('*').eq('tenant_id', tenantId).eq('available', true).order('featured', { ascending: false }).order('name'),
    supabase
      .from('product_toppings')
      .select('id, menu_item_id, name, price, is_required, sort_order')
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
  const slug = tenant?.slug || tenantSlug
  const primary = branding?.primary_color || '#e43d30'
  const secondary = branding?.secondary_color || '#15130f'
  const accent = branding?.accent_color || primary
  const background = branding?.background_color || '#f8f5ef'
  const surfaceText = readableText('#ffffff')
  const heroText = readableText(secondary)
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

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: background, fontFamily }}>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          {logoUrl ? (
            <div className="relative h-12 w-16 flex-shrink-0">
              <Image src={logoUrl} alt={restaurantName} fill sizes="64px" className="object-contain" priority />
            </div>
          ) : (
            <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-lg font-black" style={{ backgroundColor: primary, color: readableText(primary) }}>
              {restaurantName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-[#15130f]">{restaurantName}</p>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-black/42">Carta QR</p>
          </div>
          <Link href={`/${slug}`} className="rounded-full border border-black/10 px-3 py-2 text-xs font-black text-black/55">
            Inicio
          </Link>
        </div>

        {categories.length > 0 && (
          <nav className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {featured.length > 0 && (
              <a href="#destacados" className="h-9 flex-shrink-0 rounded-full px-4 py-2 text-xs font-black text-white" style={{ backgroundColor: primary }}>
                Destacados
              </a>
            )}
            {categories.map(category => (
              <a
                key={category.id}
                href={`#cat-${category.id}`}
                className="h-9 flex-shrink-0 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black text-black/62"
              >
                {category.name}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-5 pt-4">
        <div className="overflow-hidden rounded-[1.7rem] shadow-2xl shadow-black/10" style={{ backgroundColor: secondary }}>
          <div className="relative min-h-[190px] p-5">
            {branding?.hero_image_url && (
              <Image
                src={branding.hero_image_url}
                alt=""
                fill
                sizes="100vw"
                className="object-cover opacity-35"
                priority
              />
            )}
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: `${heroText}99` }}>Carta de mesa</p>
              <h1 className="mt-3 max-w-sm text-4xl font-black leading-[0.95]" style={{ color: heroText }}>
                Mira la carta, elige con calma.
              </h1>
              <p className="mt-4 max-w-md text-sm font-bold leading-6" style={{ color: `${heroText}b8` }}>
                Esta vista es solo para consultar productos, precios y opciones. Para pedir, avisa al camarero.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12">
        {featured.length > 0 && (
          <section id="destacados" className="scroll-mt-32 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-xl shadow-black/[0.04]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/38">Recomendados</p>
                <h2 className="text-xl font-black text-[#15130f]">Lo mas pedido</h2>
              </div>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <div className="grid gap-3">
              {featured.map(item => (
                <CartaItem
                  key={item.id}
                  item={item}
                  toppings={toppingsByItem.get(item.id) || []}
                  primary={primary}
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
            <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-32 rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-xl shadow-black/[0.04]">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/38">Categoria</p>
                <h2 className="text-2xl font-black text-[#15130f]">{category.name}</h2>
                {category.description && <p className="mt-1 text-sm font-semibold leading-6 text-black/50">{category.description}</p>}
              </div>
              <div className="grid gap-3">
                {categoryItems.map(item => (
                  <CartaItem
                    key={item.id}
                    item={item}
                    toppings={toppingsByItem.get(item.id) || []}
                    primary={primary}
                    currencyInfo={currencyInfo}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {uncategorized.length > 0 && (
          <section className="rounded-[1.5rem] border border-black/8 bg-white p-4 shadow-xl shadow-black/[0.04]">
            <h2 className="mb-4 text-2xl font-black text-[#15130f]">Otros productos</h2>
            <div className="grid gap-3">
              {uncategorized.map(item => (
                <CartaItem
                  key={item.id}
                  item={item}
                  toppings={toppingsByItem.get(item.id) || []}
                  primary={primary}
                  currencyInfo={currencyInfo}
                />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-xl shadow-black/[0.04]">
            <p className="text-lg font-black text-[#15130f]">Carta sin productos visibles</p>
            <p className="mt-2 text-sm font-semibold text-black/50">Activa productos desde el panel para mostrarlos aqui.</p>
          </div>
        )}
      </div>
    </main>
  )
}

function CartaItem({
  item,
  toppings,
  primary,
  currencyInfo,
}: {
  item: MenuItem
  toppings: Topping[]
  primary: string
  currencyInfo: { code: string; locale: string }
}) {
  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[1.1rem] border border-black/8 bg-[#fbfaf7] p-2.5">
      <div className="relative h-24 overflow-hidden rounded-[0.9rem] bg-black/[0.04]">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="88px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xl font-black text-black/20">
            {item.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-black leading-5 text-[#15130f]">{item.name}</h3>
          <p className="flex-shrink-0 text-base font-black" style={{ color: primary }}>
            {formatPriceWithCurrency(item.price, currencyInfo.code, currencyInfo.locale)}
          </p>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-black/50">{item.description}</p>
        )}
        {toppings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {toppings.slice(0, 4).map(topping => (
              <span key={topping.id} className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-black/45 ring-1 ring-black/8">
                {topping.name}{Number(topping.price || 0) > 0 ? ` +${formatPriceWithCurrency(Number(topping.price), currencyInfo.code, currencyInfo.locale)}` : ''}
              </span>
            ))}
            {toppings.length > 4 && (
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-black/35 ring-1 ring-black/8">
                +{toppings.length - 4} mas
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
