export const dynamic = 'force-dynamic'
export const revalidate = 0
export const dynamicParams = true

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses } from '@/lib/pageConfig'
import BottomNav from '@/components/store/BottomNav'
import BannerSection from '@/components/store/sections/BannerSection'
import FeaturedSection from '@/components/store/sections/FeaturedSection'
import InfoSection from '@/components/store/sections/InfoSection'
import AboutSection from '@/components/store/sections/AboutSection'
import GallerySection from '@/components/store/sections/GallerySection'
import HoursSection from '@/components/store/sections/HoursSection'
import SocialSection from '@/components/store/sections/SocialSection'
import TestimonialsSection from '@/components/store/sections/TestimonialsSection'
import ActionsSection from '@/components/store/sections/ActionsSection'
import WhatsAppFloat from '@/components/store/WhatsAppFloat'
import StoreClosed from '@/components/store/StoreClosed'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'

interface HomePageProps {
  params: Promise<{ domain: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { domain } = await params
  const context = await getTenantContext(domain)
  const { tenant, settings, branding } = context

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black text-gray-900">Restaurante no encontrado</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500">No existe un restaurante en esta direccion.</p>
        </div>
      </div>
    )
  }

  const storeEnabled = (tenant as any).metadata?.store_enabled !== false
  if (!storeEnabled) {
    return (
      <StoreClosed
        tenantSlug={tenant.slug || domain}
        restaurantName={branding?.app_name || tenant.organization_name}
        logoUrl={tenant.logo_url}
        primaryColor={branding?.primary_color}
      />
    )
  }

  const pageConfig = getPageConfig((tenant as any).metadata?.page_config || branding?.page_config)
  const { hero, sections, appearance, social, banner, about, gallery, testimonials, footer } = pageConfig

  const supabase = await createClient()
  const { data: orders } = await supabase.from('orders').select('items').eq('tenant_id', tenant.id)

  const itemCounts: Record<string, number> = {}
  orders?.forEach(order => {
    if (!Array.isArray(order.items)) return
    order.items.forEach((item: any) => {
      const itemId = item.id || item.menu_item_id
      if (itemId) itemCounts[itemId] = (itemCounts[itemId] || 0) + (item.quantity || item.qty || 1)
    })
  })

  const topItemIds = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  let featured: any[] = []
  if (topItemIds.length > 0) {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('available', true)
      .in('id', topItemIds)
    featured = data || []
    featured.sort((a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0))
  } else {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('featured', true)
      .eq('available', true)
      .limit(8)
    featured = data || []
  }

  const primary = branding?.primary_color || '#E4002B'
  const secondary = branding?.secondary_color || '#15130f'
  const appName = branding?.app_name || tenant.organization_name
  const tagline = branding?.tagline || settings?.description || ''
  const heroImage = hero.image_url || (branding as any)?.hero_image_url || (branding as any)?.hero?.image_url
  const br = getBorderRadius(appearance.border_radius)
  const cardCls = getCardClasses(appearance.card_style)
  const btnCls = getButtonClasses(appearance.button_style)
  const anim = appearance.animations
  const enabledSections = [...sections].filter(s => s.enabled).sort((a, b) => a.order - b.order)
  const heroTitle = hero.title_text || appName
  const heroSubtitle = hero.subtitle_text || tagline
  const whatsappLink = social.whatsapp || branding?.whatsapp_number || null
  const heroMinHeight = hero.height === 'small' ? '560px' : hero.height === 'medium' ? '640px' : '720px'
  const heroOverlay = Math.min(Math.max(hero.overlay_opacity || 45, 26), 78) / 100
  const countryCurrency = getCurrencyByCountry(settings?.country_code || settings?.country || (tenant as any)?.country || 'ES')
  const currencyInfo = settings?.currency
    ? { ...countryCurrency, code: settings.currency, symbol: settings.currency_symbol || countryCurrency.symbol }
    : countryCurrency
  const formatMoney = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale)

  return (
    <div className="store-surface min-h-screen overflow-hidden bg-[#faf8f3] pb-[88px] text-[#15130f]">
      <section className="relative overflow-hidden" style={{ minHeight: heroMinHeight }}>
        <div className="absolute inset-0">
          {heroImage ? (
            <img src={heroImage} alt={appName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary}, #111111)` }} />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${Math.min(heroOverlay + 0.25, 0.86)}) 0%, rgba(0,0,0,${heroOverlay}) 48%, rgba(0,0,0,0.22) 100%)` }} />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#faf8f3] to-transparent" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href={`/${tenant.slug}`} className="flex min-w-0 items-center gap-3">
            {hero.show_logo && tenant.logo_url ? (
              <span className="flex h-12 w-28 flex-shrink-0 items-center justify-center overflow-visible sm:w-36 lg:w-44">
                <img src={tenant.logo_url} alt={appName} className="max-h-full max-w-full scale-150 object-contain drop-shadow-xl sm:scale-[1.85] lg:scale-[2.15]" />
              </span>
            ) : (
              <span className="flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-black text-white backdrop-blur-md">
                {appName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-base font-black text-white">{appName}</span>
              <span className="block truncate text-xs font-bold uppercase text-white/70">Ordena en linea</span>
            </span>
          </Link>
          <Link href={`/${tenant.slug}/menu`} className={`hidden px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.02] sm:inline-flex ${btnCls}`} style={{ backgroundColor: primary }}>
            Ver menu
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex rounded-full border border-white/18 bg-white/12 px-4 py-2 text-xs font-black uppercase text-white/80 backdrop-blur-md">
              Experiencia directa del restaurante
            </div>
            <h1 className="text-5xl font-black leading-[0.92] text-white drop-shadow-xl sm:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/84 sm:text-xl">
                {heroSubtitle}
              </p>
            )}
            {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${tenant.slug}/menu`} className={`inline-flex h-14 items-center justify-center px-7 text-sm font-black text-white shadow-2xl transition hover:scale-[1.02] ${btnCls}`} style={{ backgroundColor: primary }}>
                {hero.cta_primary_text || 'Ver menu'}
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`/${tenant.slug}/reservas`} className={`inline-flex h-14 items-center justify-center border border-white/35 bg-white/14 px-7 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/22 ${btnCls}`}>
                  {hero.cta_secondary_text || 'Reservar'}
                </Link>
              )}
            </div>
          </div>

          {featured.length > 0 && (
            <div className="hidden self-end rounded-[28px] border border-white/18 bg-white/14 p-3 shadow-2xl backdrop-blur-xl lg:block">
              <div className="rounded-[22px] bg-white p-4">
                <p className="text-xs font-black uppercase text-black/45">Favoritos de la casa</p>
                <div className="mt-4 space-y-3">
                  {featured.slice(0, 3).map((item: any) => (
                    <Link key={item.id} href={`/${tenant.slug}/menu`} className="flex items-center gap-3 rounded-2xl border border-black/8 p-2 transition hover:border-black/18 hover:bg-black/[0.025]">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="size-16 rounded-xl object-cover" />
                      ) : (
                        <span className="size-16 rounded-xl" style={{ backgroundColor: `${primary}20` }} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[#15130f]">{item.name}</span>
                        <span className="mt-1 block text-sm font-black" style={{ color: primary }}>{formatMoney(item.price)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-10 max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {enabledSections.map(section => {
          const sTitle = section.title || ''
          switch (section.type) {
            case 'banner':
              return <PremiumBand key={section.id}><BannerSection banner={banner} borderRadius={br} /></PremiumBand>
            case 'featured':
              return <FeaturedSection key={section.id} tenantId={tenant.slug} items={featured || []} primary={primary} title={sTitle || 'Lo mas pedido'} borderRadius={br} cardClasses={cardCls} animations={anim} currencyInfo={currencyInfo} />
            case 'about':
              return <PremiumBand key={section.id}><AboutSection about={about} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'info':
              return settings ? <PremiumBand key={section.id}><InfoSection settings={settings} primary={primary} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'gallery':
              return <PremiumBand key={section.id}><GallerySection gallery={gallery} title={sTitle || 'Galeria'} borderRadius={br} /></PremiumBand>
            case 'hours':
              return settings ? <PremiumBand key={section.id}><HoursSection settings={settings} primary={primary} title={sTitle || 'Horarios'} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'testimonials':
              return <PremiumBand key={section.id}><TestimonialsSection testimonials={testimonials} primary={primary} title={sTitle || 'Opiniones'} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'actions':
              return settings ? <ActionsSection key={section.id} tenantId={tenant.slug} settings={settings} primary={primary} borderRadius={br} /> : null
            case 'social':
              return <PremiumBand key={section.id}><SocialSection social={social} primary={primary} title={sTitle || 'Siguenos'} borderRadius={br} /></PremiumBand>
            default:
              return null
          }
        })}
      </main>

      <footer className="mt-10 border-t border-black/8 bg-white/70 px-4 py-8">
        <div className="mx-auto max-w-7xl text-center">
          {footer.custom_text && <p className="text-sm font-bold text-black/65">{footer.custom_text}</p>}
          <p className="mt-2 text-xs font-bold text-black/42">{new Date().getFullYear()} {appName}</p>
          {footer.show_powered_by && <p className="mt-2 text-xs font-bold text-black/35">Por Eccofood</p>}
        </div>
      </footer>

      <BottomNav tenantId={tenant.slug} primaryColor={primary} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={appName} primaryColor="#25D366" />
    </div>
  )
}

function PremiumBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white/88 shadow-xl shadow-black/[0.04]">
      {children}
    </section>
  )
}

function InfoPills({ settings, primary }: { settings: any; primary: string }) {
  if (!settings) return null
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {settings.delivery_enabled && (
        <span className="rounded-full border border-white/22 bg-white/14 px-4 py-2 text-sm font-black text-white backdrop-blur-md">
          Delivery {settings.delivery_time_minutes ?? 30} min
        </span>
      )}
      {settings.city && (
        <span className="rounded-full border border-white/22 bg-white/14 px-4 py-2 text-sm font-black text-white backdrop-blur-md">
          {settings.city}
        </span>
      )}
      {settings.cash_payment_enabled && (
        <span className="rounded-full border border-white/22 bg-white/14 px-4 py-2 text-sm font-black text-white backdrop-blur-md" style={{ boxShadow: `inset 0 -2px 0 ${primary}` }}>
          Pago flexible
        </span>
      )}
    </div>
  )
}

