import { getTenantContext } from '@/lib/tenant'
import { createClient } from '@/lib/supabase/server'
import { getPageConfig, getBorderRadius, getCardClasses, getButtonClasses, getHeroHeight } from '@/lib/pageConfig'
import Link from 'next/link'
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

interface HomePageProps {
  params: Promise<{ domain: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { domain: tenantId } = await params
  const context = await getTenantContext(tenantId)
  const { tenant, settings, branding } = context

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurante no encontrado</h1>
          <p className="text-gray-500">No existe un restaurante en esta dirección.</p>
        </div>
      </div>
    )
  }

  // Page config from branding
  const pageConfig = getPageConfig(branding?.page_config)
  const { hero, sections, appearance, social, banner, about, gallery, testimonials, footer } = pageConfig

  const supabase = await createClient()
  const { data: featured } = await supabase
    .from('menu_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('featured', true)
    .eq('available', true)
    .limit(8)

  const primary = branding?.primary_color || '#3B82F6'
  const secondary = branding?.secondary_color || '#1F2937'
  const appName = branding?.app_name || tenant.organization_name
  const tagline = branding?.tagline || settings?.description || ''
  const heroImage = settings?.featured_image_url

  // Style helpers
  const br = getBorderRadius(appearance.border_radius)
  const cardCls = getCardClasses(appearance.card_style)
  const btnCls = getButtonClasses(appearance.button_style)
  const heroH = getHeroHeight(hero.height)
  const anim = appearance.animations

  // Sort enabled sections
  const enabledSections = [...sections]
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order)

  // Hero texts
  const heroTitle = hero.title_text || appName
  const heroSubtitle = hero.subtitle_text || tagline

  return (
    <div className="min-h-screen bg-gray-50 pb-[72px]">
      {/* ─── HERO ─────────────────────────────────── */}
      {hero.style === 'minimal' ? (
        /* Minimal Hero */
        <div className="bg-white px-4 pt-12 pb-8 border-b relative">
          <div className="max-w-lg mx-auto">
            <div className="absolute top-4 right-4 z-10">
              <Link href={`/${tenantId}/admin/login`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Admin</Link>
            </div>
            <div className="flex items-center gap-4 mb-4">
              {hero.show_logo && tenant.logo_url && (
                <img src={tenant.logo_url} alt={appName} className="w-16 h-16 object-cover shadow-sm" style={{ borderRadius: br }} />
              )}
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{heroTitle}</h1>
                {heroSubtitle && <p className="text-sm text-gray-500 mt-0.5">{heroSubtitle}</p>}
              </div>
            </div>
            {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
            <div className="flex gap-3 mt-5">
              <Link href={`/${tenantId}/menu`} className={`flex-1 py-3 text-sm font-bold text-center text-white shadow-md active:scale-[0.97] transition-transform ${btnCls}`} style={{ backgroundColor: primary }}>
                {hero.cta_primary_text}
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`/${tenantId}/reservas`} className={`flex-1 py-3 text-sm font-bold text-center border-2 active:scale-[0.97] transition-transform ${btnCls}`} style={{ borderColor: primary, color: primary }}>
                  {hero.cta_secondary_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : hero.style === 'split' ? (
        /* Split Hero */
        <div className="bg-white">
          <div className="max-w-lg mx-auto grid grid-cols-5" style={{ minHeight: heroH }}>
            <div className="col-span-2 relative overflow-hidden">
              {heroImage ? (
                <img src={heroImage} alt={appName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(160deg, ${primary}ee 0%, ${primary}88 100%)` }} />
              )}
            </div>
            <div className="col-span-3 flex flex-col justify-center p-6 relative">
              <div className="absolute top-4 right-4">
                <Link href={`/${tenantId}/admin/login`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Admin</Link>
              </div>
              {hero.show_logo && tenant.logo_url && (
                <img src={tenant.logo_url} alt={appName} className="w-14 h-14 object-cover mb-3 shadow-sm" style={{ borderRadius: br }} />
              )}
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-1">{heroTitle}</h1>
              {heroSubtitle && <p className="text-sm text-gray-500 mb-4">{heroSubtitle}</p>}
              {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
              <div className="flex gap-3 mt-5">
                <Link href={`/${tenantId}/menu`} className={`flex-1 py-3 text-sm font-bold text-center text-white shadow-md active:scale-[0.97] transition-transform ${btnCls}`} style={{ backgroundColor: primary }}>
                  {hero.cta_primary_text}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Image / Gradient / Parallax Hero */
        <div className="relative overflow-hidden" style={{ height: heroH, minHeight: '320px' }}>
          {heroImage ? (
            <img src={heroImage} alt={appName} className={`w-full h-full object-cover ${hero.style === 'parallax' ? 'scale-110' : ''}`} />
          ) : (
            <div className="w-full h-full" style={{
              background: hero.style === 'gradient'
                ? `linear-gradient(${hero.gradient_angle}deg, ${primary}ee 0%, ${secondary}dd 50%, #0f172a 100%)`
                : `linear-gradient(135deg, ${primary}dd 0%, ${primary}99 50%, #0f172a 100%)`,
            }} />
          )}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,${hero.overlay_opacity * 0.003}) 0%, rgba(0,0,0,${hero.overlay_opacity * 0.008}) 50%, rgba(0,0,0,${hero.overlay_opacity * 0.015}) 100%)`,
          }} />
          <div className="absolute top-4 right-4 z-10">
            <Link href={`/${tenantId}/admin/login`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 transition-colors">Admin</Link>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
            {hero.show_logo && tenant.logo_url && (
              <div className="mb-3">
                <img src={tenant.logo_url} alt={appName} className="w-16 h-16 object-cover shadow-lg border-2 border-white/30" style={{ borderRadius: br }} />
              </div>
            )}
            <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{heroTitle}</h1>
            {heroSubtitle && <p className="text-white/80 text-sm mb-4 line-clamp-2">{heroSubtitle}</p>}
            {hero.show_info_pills && (
              <div className="flex flex-wrap gap-2 mb-5">
                {settings?.delivery_enabled && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">🚗 {settings.delivery_time_minutes ?? 30} min</span>
                )}
                {settings?.city && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">📍 {settings.city}</span>
                )}
                {settings?.cash_payment_enabled && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">💳 Efectivo y tarjeta</span>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <Link href={`/${tenantId}/menu`} className={`flex-1 py-3.5 text-sm font-bold text-center shadow-lg active:scale-[0.97] transition-transform ${btnCls}`} style={{ backgroundColor: primary, color: '#fff' }}>
                {hero.cta_primary_text}
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`/${tenantId}/reservas`} className={`flex-1 py-3.5 text-sm font-bold text-center bg-white/20 backdrop-blur-sm text-white border border-white/40 active:scale-[0.97] transition-transform ${btnCls}`}>
                  {hero.cta_secondary_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── DYNAMIC SECTIONS ────────────────────────── */}
      {enabledSections.map(section => {
        const sTitle = section.title || ''
        switch (section.type) {
          case 'banner':
            return <div key={section.id} className="pt-4"><BannerSection banner={banner} borderRadius={br} /></div>
          case 'featured':
            return <FeaturedSection key={section.id} tenantId={tenantId} items={featured || []} primary={primary} title={sTitle || 'Lo más pedido'} borderRadius={br} cardClasses={cardCls} animations={anim} />
          case 'about':
            return <AboutSection key={section.id} about={about} borderRadius={br} cardClasses={cardCls} />
          case 'info':
            return settings ? <InfoSection key={section.id} settings={settings} primary={primary} borderRadius={br} cardClasses={cardCls} /> : null
          case 'gallery':
            return <GallerySection key={section.id} gallery={gallery} title={sTitle || 'Galería'} borderRadius={br} />
          case 'hours':
            return settings ? <HoursSection key={section.id} settings={settings} primary={primary} title={sTitle || 'Horarios'} borderRadius={br} cardClasses={cardCls} /> : null
          case 'testimonials':
            return <TestimonialsSection key={section.id} testimonials={testimonials} primary={primary} title={sTitle || 'Opiniones'} borderRadius={br} cardClasses={cardCls} />
          case 'actions':
            return settings ? <ActionsSection key={section.id} tenantId={tenantId} settings={settings} primary={primary} borderRadius={br} /> : null
          case 'social':
            return <SocialSection key={section.id} social={social} primary={primary} title={sTitle || 'Síguenos'} borderRadius={br} />
          default:
            return null
        }
      })}

      {/* Footer */}
      <div className="mt-8 mb-4 text-center space-y-1">
        {footer.custom_text && <p className="text-xs text-gray-400">{footer.custom_text}</p>}
        {footer.show_powered_by && <p className="text-[10px] text-gray-300">Powered by Restaurant.SV</p>}
      </div>

      <BottomNav tenantId={tenantId} primaryColor={primary} />
    </div>
  )
}

function InfoPills({ settings, primary }: { settings: any; primary: string }) {
  if (!settings) return null
  return (
    <div className="flex flex-wrap gap-2">
      {settings.delivery_enabled && (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${primary}12`, color: primary }}>🚗 {settings.delivery_time_minutes ?? 30} min</span>
      )}
      {settings.city && (
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">📍 {settings.city}</span>
      )}
    </div>
  )
}
