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
import { ArrowRight, Bell, Camera, ChefHat, Globe, Heart, Leaf, Menu, MessageCircle, Play, Users, Wine } from 'lucide-react'

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
  const themeMode = appearance.theme_mode

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
  const isLightTheme = themeMode === 'light'
  const lightPrimary = '#ff5a00'
  const lightAccent = '#ff1f1f'
  const lightSecondary = '#f3f4f6'
  const darkGold = '#D4AF37'
  const darkRust = '#D35A37'
  const darkNavy = '#0B0E14'
  const darkPanel = '#1A1F2C'
  const darkMuted = '#8b97a8'
  const darkGoldSoft = '#F4D58D'
  const storePrimary = isLightTheme ? lightPrimary : darkGold
  const storeSecondary = isLightTheme ? lightAccent : darkRust
  const storeButton = isLightTheme ? lightPrimary : darkRust
  const storePrice = isLightTheme ? lightAccent : darkGold
  const themeColors = isLightTheme
    ? {
        background: '#ffffff',
        surface: '#ffffff',
        soft: 'rgba(255, 90, 0, 0.10)',
        text: '#07111f',
        muted: 'rgba(7, 17, 31, 0.72)',
        header: 'rgba(255, 255, 255, 0.96)',
        heroPanel: '#ffffff',
        heroText: '#111827',
        footerText: 'rgba(17, 24, 39, 0.68)',
      }
    : {
        background: darkNavy,
        surface: 'rgba(26, 31, 44, 0.78)',
        soft: 'rgba(212, 175, 55, 0.10)',
        text: '#ffffff',
        muted: darkMuted,
        header: 'rgba(11, 14, 20, 0.72)',
        heroPanel: 'rgba(26, 31, 44, 0.78)',
        heroText: '#ffffff',
        footerText: darkMuted,
      }
  const pageBackgroundStyle = {
    '--primary-color': storePrimary,
    '--secondary-color': storeSecondary,
    '--button-primary-color': storeButton,
    '--button-secondary-color': isLightTheme ? lightSecondary : 'rgba(255,255,255,0.08)',
    '--price-color': storePrice,
    '--brand-background-color': themeColors.background,
    '--brand-surface-color': themeColors.surface,
    '--brand-soft-color': themeColors.soft,
    '--brand-text-color': themeColors.text,
    '--brand-muted-color': themeColors.muted,
    backgroundColor: themeColors.background,
    ...(sectionBackgroundImage
      ? {
          backgroundImage: isLightTheme
            ? `linear-gradient(rgba(255,255,255,.92), rgba(255,255,255,.97)), url(${sectionBackgroundImage})`
            : `linear-gradient(rgba(11,14,20,.84), rgba(11,14,20,.94)), url(${sectionBackgroundImage})`,
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
  const heroFallbackBackground = isLightTheme
    ? 'linear-gradient(180deg, #ffffff 0%, #f4f4f5 58%, #e5e7eb 100%)'
    : `radial-gradient(circle at 72% 28%, ${darkGold}44, transparent 28rem), radial-gradient(circle at 18% 10%, rgba(211,90,55,.14), transparent 26rem), linear-gradient(135deg, ${darkNavy} 0%, ${darkPanel} 58%, ${darkNavy} 100%)`
  const heroShade = isLightTheme
    ? heroImage
      ? 'linear-gradient(90deg, rgba(20,9,2,.56) 0%, rgba(20,9,2,.34) 48%, rgba(20,9,2,.12) 100%)'
      : 'linear-gradient(90deg, rgba(255,255,255,.42) 0%, rgba(255,255,255,.20) 48%, rgba(255,255,255,.08) 100%)'
    : `linear-gradient(90deg, rgba(0,0,0,${Math.min(heroOverlay + 0.32, 0.90)}) 0%, rgba(0,0,0,${Math.min(heroOverlay + 0.12, 0.82)}) 48%, rgba(0,0,0,0.30) 100%)`
  const heroTextColor = isLightTheme && !heroImage ? '#07111f' : '#ffffff'
  const heroMutedColor = isLightTheme && !heroImage ? 'rgba(7, 17, 31, 0.76)' : 'rgba(255,255,255,.84)'
  const heroFeaturePanelClass = isLightTheme
    ? 'hidden self-stretch rounded-[28px] border border-orange-300/50 bg-white/90 p-3 shadow-2xl shadow-orange-500/10 backdrop-blur-xl lg:block'
    : 'hidden self-stretch rounded-[28px] border border-[#D4AF37]/22 bg-[#1A1F2C]/78 p-3 shadow-2xl backdrop-blur-xl lg:block'
  const heroFeatureInnerClass = isLightTheme
    ? 'rounded-[22px] border border-orange-300/50 bg-white p-4'
    : 'rounded-[22px] border border-[#D4AF37]/18 bg-[#0B0E14]/55 p-4'
  const countryCurrency = getCurrencyByCountry(settings?.country_code || settings?.country || (tenant as any)?.country || 'ES')
  const currencyInfo = settings?.currency
    ? { ...countryCurrency, code: settings.currency, symbol: settings.currency_symbol || countryCurrency.symbol }
    : countryCurrency
  const formatMoney = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo.code, currencyInfo.locale)

  return (
    <div className={`ecco-store-premium ${isLightTheme ? 'ecco-store-light' : 'ecco-store-dark'} store-surface min-h-screen overflow-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))]`} style={pageBackgroundStyle}>
      <header className="fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl" style={{ position: 'fixed', paddingTop: 'env(safe-area-inset-top)', backgroundColor: themeColors.header, borderColor: isLightTheme ? 'rgba(7, 17, 31, 0.12)' : 'rgba(212, 175, 55, 0.16)' }}>
        <div className="mx-auto grid h-[4.75rem] max-w-7xl grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="store-app-icon-button" type="button" aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
          <Link href={tenantHomePath} className="flex min-w-0 items-center justify-center gap-3 text-center" aria-label={appName}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={appName} className="h-11 w-14 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.38)]" />
            ) : null}
            <span className="min-w-0">
              <span className="block truncate text-2xl font-black tracking-[0.08em]" style={{ color: isLightTheme ? '#07111f' : '#fffaf0' }}>{appName}</span>
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: storePrimary }}>Cocina digital</span>
            </span>
          </Link>
          <div className="relative flex justify-end">
            <button className="store-app-icon-button" type="button" aria-label="Idioma">
              <Bell className="h-5 w-5" />
            </button>
            <LanguageSwitcher compact className="absolute right-0 top-0 h-12 w-12 opacity-0" reloadOnChange />
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-4 pb-5 pt-2 sm:px-6 sm:pt-5 lg:px-8">
        <div className="store-hero-invert store-app-hero relative overflow-hidden rounded-[34px] border shadow-[0_26px_90px_rgba(0,0,0,.36),inset_0_1px_0_rgba(255,255,255,.12)]" style={{ minHeight: `min(${heroMinHeight}, 620px)`, backgroundColor: themeColors.heroPanel, borderColor: isLightTheme ? 'rgba(7,17,31,.12)' : 'rgba(212,175,55,.18)' }}>
        <div className="absolute inset-0">
          {heroImage ? (
            <img src={heroImage} alt={appName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: heroFallbackBackground }} />
          )}
          <div className="absolute inset-0" style={{ background: heroShade }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(212,175,55,.20),transparent_22rem),radial-gradient(circle_at_88%_18%,rgba(255,255,255,.09),transparent_26rem)]" />
          <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: `linear-gradient(to top, ${themeColors.background}, transparent)` }} />
        </div>

        <Link
          href={tenantHomePath}
          className="absolute left-6 top-6 z-20 hidden items-center justify-center sm:left-8 sm:top-7 lg:flex"
          aria-label={appName}
        >
          {tenant.logo_url ? (
            <span className="flex h-24 w-28 flex-shrink-0 items-center justify-center overflow-visible sm:h-28 sm:w-32">
              <img src={tenant.logo_url} alt={appName} className="max-h-full max-w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,.32)]" />
            </span>
          ) : (
            <span className="grid size-20 flex-shrink-0 place-items-center rounded-2xl border text-3xl font-black sm:size-24 sm:text-4xl" style={{ borderColor: isLightTheme ? 'rgba(255,90,0,.35)' : 'rgba(231,180,63,.28)', backgroundColor: isLightTheme ? lightPrimary : 'rgba(231,180,63,.15)', color: isLightTheme ? '#07111f' : '#ffcf64' }}>
              {appName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </Link>

        <div className="relative z-10 grid gap-7 px-5 pb-7 pt-20 sm:px-8 sm:pb-9 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-12 lg:pt-44">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] backdrop-blur-md" style={{ borderColor: isLightTheme && !heroImage ? 'rgba(34,17,6,.18)' : 'rgba(212,175,55,.30)', backgroundColor: isLightTheme && !heroImage ? 'rgba(255,255,255,.54)' : 'rgba(212,175,55,.10)', color: isLightTheme && !heroImage ? '#9a3412' : '#D4AF37' }}>
              Bienvenidos a {appName}
            </div>
            <h1 className="store-app-display max-w-3xl text-5xl font-black leading-[0.96] drop-shadow-xl sm:text-6xl lg:text-7xl" style={{ color: heroTextColor }}>
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mt-5 max-w-xl text-base font-semibold leading-7 sm:text-lg" style={{ color: heroMutedColor }}>
                {heroSubtitle}
              </p>
            )}
            {featuredText && (
              <div className="mt-5 max-w-2xl rounded-2xl border border-[#e7b43f]/22 bg-white/10 px-4 py-3 text-sm font-black leading-6 text-[#fff7df] shadow-xl backdrop-blur-md" style={{ boxShadow: `inset 4px 0 0 ${storePrimary}` }}>
                {featuredText}
              </div>
            )}
            {hero.show_info_pills && <InfoPills settings={settings} primary={storePrimary} />}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href={`${tenantBasePath}/menu`}
                className="store-app-primary-button inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-7 text-sm font-black uppercase tracking-wide transition hover:-translate-y-0.5 active:scale-[0.98]"
                style={{
                  background: storeButton,
                  color: '#ffffff',
                  boxShadow: isLightTheme ? '0 18px 42px rgba(7,17,31,.14)' : '0 18px 46px rgba(211,90,55,.34)',
                }}
              >
                {hero.cta_primary_text || tr('store.viewMenu')}
                <ArrowRight className="h-5 w-5" />
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`${tenantBasePath}/reservas`} className="store-app-play-button inline-flex size-14 items-center justify-center rounded-full border border-[#D4AF37]/55 bg-black/30 text-[#D4AF37] backdrop-blur-md transition hover:bg-[#D4AF37]/10 active:scale-[0.98]" aria-label={hero.cta_secondary_text || tr('store.reserve')}>
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </Link>
              )}
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm font-black" style={{ color: storePrimary }}>
              <span>01</span>
              <span className="h-1 w-14 rounded-full" style={{ backgroundColor: storePrimary }} />
              <span className="h-1 w-14 rounded-full bg-white/18" />
              <span className="h-1 w-14 rounded-full bg-white/18" />
              <span className="text-white/58">03</span>
            </div>
          </div>

          {featured.length > 0 && (
            <div className={heroFeaturePanelClass}>
              <div className={heroFeatureInnerClass}>
                <p className="text-xs font-black uppercase" style={{ color: isLightTheme ? '#db2777' : '#e7b43f' }}>{tr('store.favorites')}</p>
                <div className="mt-4 space-y-3">
                  {featured.slice(0, 3).map((item: any) => (
                    <Link key={item.id} href={`${tenantBasePath}/menu`} className="flex items-center gap-3 rounded-2xl border p-2 transition hover:-translate-y-0.5" style={{ borderColor: isLightTheme ? 'rgba(249,115,22,.18)' : 'rgba(231,180,63,.14)', backgroundColor: isLightTheme ? 'rgba(255,247,232,.72)' : undefined }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="size-16 rounded-xl object-cover" />
                      ) : (
                        <span className="size-16 rounded-xl" style={{ backgroundColor: `${storePrimary}20` }} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black" style={{ color: isLightTheme ? themeColors.text : '#fff7df' }}>{item.name}</span>
                        <span className="mt-1 block text-sm font-black" style={{ color: storePrice }}>{formatMoney(item.price)}</span>
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

      {!isLightTheme && (
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Experiencia {appName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {[
              { title: 'Ingredientes frescos', text: 'Productos seleccionados para cada pedido.', Icon: Leaf },
              { title: 'Cocina de autor', text: 'Platos preparados con identidad propia.', Icon: ChefHat },
              { title: 'Experiencia unica', text: 'Servicio digital pensado para disfrutar.', Icon: Wine },
              { title: 'Pasion por detalles', text: 'Cada producto se muestra con claridad.', Icon: Heart },
            ].map(({ title, text, Icon }) => (
              <article key={title} className="store-app-glass-card rounded-[22px] p-4 sm:p-6">
                <Icon className="mb-5 h-8 w-8 text-[#D4AF37]" />
                <h3 className="text-base font-black uppercase leading-snug text-white sm:text-xl">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/62">{text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        {enabledSections.map(section => {
          const sTitle = section.title || ''
          switch (section.type) {
            case 'banner':
              return <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><BannerSection banner={banner} borderRadius={br} /></PremiumBand>
            case 'featured':
              return <FeaturedSection key={section.id} tenantId={tenant.slug} items={featured || []} primary={storePrimary} buttonColor={storeButton} priceColor={storePrice} title={sTitle || tr('store.mostOrdered')} borderRadius={br} cardClasses={cardCls} animations={anim} currencyInfo={currencyInfo} basePath={tenantBasePath} />
            case 'about':
              return <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><AboutSection about={about} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'info':
              return settings ? <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><InfoSection settings={settings} primary={storePrimary} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'gallery':
              return <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><GallerySection gallery={gallery} title={sTitle || tr('store.gallery')} borderRadius={br} /></PremiumBand>
            case 'hours':
              return settings ? <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><HoursSection settings={settings} primary={storePrimary} title={sTitle || tr('store.hours')} borderRadius={br} cardClasses={cardCls} /></PremiumBand> : null
            case 'testimonials':
              return <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><TestimonialsSection testimonials={testimonials} primary={storePrimary} title={sTitle || tr('store.reviews')} borderRadius={br} cardClasses={cardCls} /></PremiumBand>
            case 'actions':
              return settings ? <ActionsSection key={section.id} tenantId={tenant.slug} settings={settings} primary={storePrimary} borderRadius={br} basePath={tenantBasePath} /> : null
            case 'social':
              return <PremiumBand key={section.id} surfaceColor={themeColors.surface} isDark={!isLightTheme}><SocialSection social={mergedSocial} primary={storePrimary} title={sTitle || 'Siguenos'} borderRadius={br} /></PremiumBand>
            default:
              return null
          }
        })}
      </main>

      <footer className="mt-10 border-t border-black/8 px-4 py-8" style={{ backgroundColor: `${themeColors.surface}cc` }}>
        <div className="mx-auto max-w-7xl text-center">
          {footer.custom_text && <p className="text-sm font-bold" style={{ color: themeColors.footerText }}>{footer.custom_text}</p>}
          <StoreSocialLinks social={mergedSocial} primary={storePrimary} />
          <p className="mt-2 text-xs font-bold" style={{ color: themeColors.footerText }}>{new Date().getFullYear()} {appName}</p>
          {footer.show_powered_by && <p className="mt-2 text-xs font-bold" style={{ color: themeColors.footerText }}>Por Eccofood</p>}
        </div>
      </footer>

      <BottomNav tenantId={tenant.slug} primaryColor={storeButton} basePath={tenantBasePath} themeMode={themeMode} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={appName} primaryColor="#25D366" />
    </div>
  )
}

function PremiumBand({ children, surfaceColor = '#ffffff', isDark = false }: { children: React.ReactNode; surfaceColor?: string; isDark?: boolean }) {
  return (
    <section className={`premium-band overflow-hidden rounded-[28px] border shadow-xl ${isDark ? 'store-app-glass-card' : 'border-black/8 bg-white shadow-black/[0.04]'}`} style={{ backgroundColor: surfaceColor, backgroundImage: 'none' }}>
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

