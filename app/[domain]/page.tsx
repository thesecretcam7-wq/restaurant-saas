export const dynamic = 'force-dynamic'
export const revalidate = 0
export const dynamicParams = true

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { cookies, headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses } from '@/lib/pageConfig'
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
import BottomNav from '@/components/store/BottomNav'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { normalizeLocale, translate } from '@/lib/i18n'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { Camera, Globe, MessageCircle, Users } from 'lucide-react'

interface HomePageProps {
  params: Promise<{ domain: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { domain } = await params
  const cookieStore = await cookies()
  const headersList = await headers()
  const hostname = (headersList.get('host') || '').split(':')[0]?.toLowerCase() || ''
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
  const isCustomDomain = Boolean(hostname && !hostname.includes(baseDomain) && !hostname.includes('localhost') && !hostname.endsWith('.vercel.app'))
  const locale = normalizeLocale(cookieStore.get('eccofood_locale')?.value)
  const tr = (key: string) => translate(locale, key)
  const context = await getTenantContext(domain)
  const { tenant, settings, branding } = context

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black text-gray-900">{tr('store.notFound')}</h1>
          <p className="mt-2 text-sm font-semibold text-gray-500">{tr('store.notFoundText')}</p>
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
  const tenantBasePath = isCustomDomain ? '' : `/${tenant.slug}`
  const tenantHomePath = tenantBasePath || '/'
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

  if (featured.length < 4) {
    const featuredIds = new Set(featured.map(item => item.id))
    const { data: fallbackItems } = await supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('available', true)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8)

    featured = [
      ...featured,
      ...(fallbackItems || []).filter(item => !featuredIds.has(item.id)),
    ].slice(0, 8)
  }

  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    surface: (branding as any)?.section_background_color,
    buttonPrimary: branding?.button_primary_color,
    buttonSecondary: branding?.button_secondary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })
  const primary = '#e7b43f'
  const secondary = '#191612'
  const accent = '#ffcf64'
  const buttonPrimary = '#e7b43f'
  const background = '#050505'
  const sectionSurface = '#151410'
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
  const featuredText = (branding as any)?.featured_text?.trim()
  const sectionBackgroundImage = (branding as any)?.section_background_image_url || ''
  const pageBackgroundStyle = {
    '--primary-color': primary,
    '--secondary-color': secondary,
    '--button-primary-color': buttonPrimary,
    '--button-secondary-color': '#28231a',
    '--price-color': accent,
    '--brand-background-color': background,
    '--brand-surface-color': sectionSurface,
    '--brand-soft-color': 'rgba(255, 247, 223, 0.08)',
    '--brand-text-color': '#fff7df',
    '--brand-muted-color': 'rgba(255, 247, 223, 0.66)',
    backgroundColor: background,
    ...(sectionBackgroundImage
      ? {
          backgroundImage: `linear-gradient(rgba(5,5,5,.84), rgba(5,5,5,.94)), url(${sectionBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }
      : {}),
  } as CSSProperties
  const mergedSocial = {
    ...social,
    instagram: social.instagram || branding?.instagram_url || '',
    facebook: social.facebook || branding?.facebook_url || '',
    whatsapp: social.whatsapp || branding?.whatsapp_number || '',
    website: social.website || (branding as any)?.website_url || '',
  }
  const whatsappLink = mergedSocial.whatsapp || null
  const heroMinHeight = hero.height === 'small' ? '420px' : hero.height === 'medium' ? '480px' : '540px'
  const heroOverlay = Math.min(Math.max(hero.overlay_opacity || 45, 26), 78) / 100
  const countryCurrency = getCurrencyByCountry(settings?.country_code || settings?.country || (tenant as any)?.country || 'ES')
  const currencyInfo = settings?.currency
    ? { ...countryCurrency, code: settings.currency, symbol: settings.currency_symbol || countryCurrency.symbol }
    : countryCurrency
  const formatMoney = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale)

  return (
    <div className="ecco-store-premium store-surface min-h-screen overflow-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4rem+env(safe-area-inset-top))] text-[#fff7df]" style={pageBackgroundStyle}>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#e7b43f]/20 bg-[#080807]/95 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={tenantHomePath} className="flex min-w-0 items-center gap-3">
            {tenant.logo_url ? (
              <span className="flex h-11 w-20 flex-shrink-0 items-center justify-center overflow-visible">
                <img src={tenant.logo_url} alt={appName} className="max-h-full max-w-full scale-150 object-contain drop-shadow-xl" />
              </span>
            ) : (
              <span className="grid size-11 flex-shrink-0 place-items-center rounded-2xl border border-[#e7b43f]/28 bg-[#e7b43f]/15 text-lg font-black text-[#ffcf64]">
                {appName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-[#fff7df] sm:text-base">{appName}</span>
              <span className="block truncate text-[11px] font-black uppercase tracking-[0.16em] text-[#e7b43f]">{tr('store.onlineOrder')}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact className="border-[#e7b43f]/25 bg-white/8 text-[#fff7df] [&_select]:text-[#fff7df]" reloadOnChange />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-[#e7b43f]/22 bg-[#151410]/86 shadow-[0_24px_80px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.08)]" style={{ minHeight: heroMinHeight }}>
        <div className="absolute inset-0">
          {heroImage ? (
            <img src={heroImage} alt={appName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary}, #111111)` }} />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${Math.min(heroOverlay + 0.25, 0.86)}) 0%, rgba(0,0,0,${heroOverlay}) 48%, rgba(0,0,0,0.22) 100%)` }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(231,180,63,.2),transparent_24rem),radial-gradient(circle_at_92%_6%,rgba(255,106,26,.16),transparent_24rem)]" />
          <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: `linear-gradient(to top, ${background}, transparent)` }} />
        </div>

        <div className="relative z-10 grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-[#e7b43f]/28 bg-[#e7b43f]/12 px-4 py-2 text-xs font-black uppercase text-[#ffcf64] backdrop-blur-md">
              Carta digital premium
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.92] text-white drop-shadow-xl sm:text-5xl lg:text-6xl">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/84 sm:text-lg">
                {heroSubtitle}
              </p>
            )}
            {featuredText && (
              <div className="mt-5 max-w-2xl rounded-2xl border border-[#e7b43f]/22 bg-white/10 px-4 py-3 text-sm font-black leading-6 text-[#fff7df] shadow-xl backdrop-blur-md" style={{ boxShadow: `inset 4px 0 0 ${primary}` }}>
                {featuredText}
              </div>
            )}
            {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {settings?.reservations_enabled && (
                <Link href={`${tenantBasePath}/reservas`} className="inline-flex h-14 items-center justify-center rounded-2xl border border-[#e7b43f]/35 bg-white/10 px-7 text-sm font-black text-[#fff7df] backdrop-blur-md transition hover:bg-white/16">
                  {hero.cta_secondary_text || tr('store.reserve')}
                </Link>
              )}
            </div>
          </div>

          {featured.length > 0 && (
            <div className="hidden self-stretch rounded-[28px] border border-[#e7b43f]/22 bg-white/10 p-3 shadow-2xl backdrop-blur-xl lg:block">
              <div className="rounded-[22px] border border-[#e7b43f]/18 bg-[#151410]/92 p-4">
                <p className="text-xs font-black uppercase text-[#e7b43f]">{tr('store.favorites')}</p>
                <div className="mt-4 space-y-3">
                  {featured.slice(0, 3).map((item: any) => (
                    <Link key={item.id} href={`${tenantBasePath}/menu`} className="flex items-center gap-3 rounded-2xl border border-[#e7b43f]/14 p-2 transition hover:border-[#e7b43f]/30 hover:bg-white/[0.04]">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="size-16 rounded-xl object-cover" />
                      ) : (
                        <span className="size-16 rounded-xl" style={{ backgroundColor: `${primary}20` }} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-[#fff7df]">{item.name}</span>
                        <span className="mt-1 block text-sm font-black" style={{ color: accent }}>{formatMoney(item.price)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {enabledSections.map(section => {
          const sTitle = section.title || ''
          switch (section.type) {
            case 'banner':
              return <PremiumBand key={section.id} surfaceColor={sectionSurface}><BannerSection banner={banner} borderRadius={br} /></PremiumBand>
            case 'featured':
              return <FeaturedSection key={section.id} tenantId={tenant.slug} items={featured || []} primary={primary} buttonColor={buttonPrimary} priceColor={accent} title={sTitle || tr('store.mostOrdered')} borderRadius={br} cardClasses={cardCls} animations={anim} currencyInfo={currencyInfo} basePath={tenantBasePath} />
            case 'about':
              return <PremiumBand key={section.id} surfaceColor={sectionSurface}><AboutSection about={about} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'info':
              return settings ? <PremiumBand key={section.id} surfaceColor={sectionSurface}><InfoSection settings={settings} primary={primary} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'gallery':
              return <PremiumBand key={section.id} surfaceColor={sectionSurface}><GallerySection gallery={gallery} title={sTitle || tr('store.gallery')} borderRadius={br} /></PremiumBand>
            case 'hours':
              return settings ? <PremiumBand key={section.id} surfaceColor={sectionSurface}><HoursSection settings={settings} primary={primary} title={sTitle || tr('store.hours')} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'testimonials':
              return <PremiumBand key={section.id} surfaceColor={sectionSurface}><TestimonialsSection testimonials={testimonials} primary={primary} title={sTitle || tr('store.reviews')} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'actions':
              return settings ? <ActionsSection key={section.id} tenantId={tenant.slug} settings={settings} primary={primary} borderRadius={br} basePath={tenantBasePath} /> : null
            case 'social':
              return <PremiumBand key={section.id} surfaceColor={sectionSurface}><SocialSection social={mergedSocial} primary={primary} title={sTitle || 'Siguenos'} borderRadius={br} /></PremiumBand>
            default:
              return null
          }
        })}
      </main>

      <footer className="mt-10 border-t border-black/8 px-4 py-8" style={{ backgroundColor: `${sectionSurface}cc` }}>
        <div className="mx-auto max-w-7xl text-center">
          {footer.custom_text && <p className="text-sm font-bold text-black/65">{footer.custom_text}</p>}
          <StoreSocialLinks social={mergedSocial} primary={primary} />
          <p className="mt-2 text-xs font-bold text-black/42">{new Date().getFullYear()} {appName}</p>
          {footer.show_powered_by && <p className="mt-2 text-xs font-bold text-black/35">Por Eccofood</p>}
        </div>
      </footer>

      <BottomNav tenantId={tenant.slug} primaryColor={buttonPrimary} basePath={tenantBasePath} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={appName} primaryColor="#25D366" />
    </div>
  )
}

function PremiumBand({ children, surfaceColor = '#ffffff' }: { children: React.ReactNode; surfaceColor?: string }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-black/8 shadow-xl shadow-black/[0.04]" style={{ backgroundColor: `${surfaceColor}e0` }}>
      {children}
    </section>
  )
}

function StoreSocialLinks({ social, primary }: { social: Record<string, string | undefined>; primary: string }) {
  const links = [
    { key: 'instagram', label: 'Instagram', href: social.instagram, Icon: Camera, color: '#E4405F' },
    { key: 'facebook', label: 'Facebook', href: social.facebook, Icon: Users, color: '#1877F2' },
    { key: 'whatsapp', label: 'WhatsApp', href: social.whatsapp, Icon: MessageCircle, color: '#25D366' },
    { key: 'website', label: 'Web', href: social.website, Icon: Globe, color: primary },
  ].filter(item => Boolean(item.href))

  if (links.length === 0) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      {links.map(({ key, label, href, Icon, color }) => (
        <a
          key={key}
          href={key === 'whatsapp' && href && !href.startsWith('http') ? `https://wa.me/${String(href).replace(/\D/g, '')}` : href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="grid size-10 place-items-center rounded-full border border-black/10 bg-white text-black/70 transition hover:-translate-y-0.5 hover:border-black/20"
          style={{ color }}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
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

