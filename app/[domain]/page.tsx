export const revalidate = 30
export const dynamicParams = true
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
  const { domain } = await params
  const context = await getTenantContext(domain)
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

  // Get top-selling items based on order history
  const { data: orders } = await supabase
    .from('orders')
    .select('items')
    .eq('tenant_id', tenant.id)

  // Count item occurrences from order items (stored as JSONB array)
  const itemCounts: Record<string, number> = {}
  if (orders) {
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemId = item.id || item.menu_item_id
          if (itemId) {
            itemCounts[itemId] = (itemCounts[itemId] || 0) + (item.quantity || 1)
          }
        })
      }
    })
  }

  // Get top 8 item IDs by quantity sold
  const topItemIds = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id)

  // Fetch top-selling items, or fallback to featured items
  let featured = []
  if (topItemIds.length > 0) {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('available', true)
      .in('id', topItemIds)
    featured = data || []
    // Sort by sales quantity to match the order
    featured.sort((a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0))
  } else {
    // Fallback: show featured items if no sales yet
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('featured', true)
      .eq('available', true)
      .limit(8)
    featured = data || []
  }

  const primary = branding?.primary_color || '#4F46E5'
  const secondary = branding?.secondary_color || '#1F2937'
  const appName = branding?.app_name || tenant.organization_name
  const tagline = branding?.tagline || settings?.description || ''
  const heroImage = (branding as any)?.page_config?.hero?.image_url || (branding as any)?.hero?.image_url

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-[72px]">
      {/* ─── HERO ─────────────────────────────────── */}
      {hero.style === 'minimal' ? (
        /* Minimal Hero - Professional */
        <div className="bg-white px-4 pt-12 pb-8 border-b border-gray-100 shadow-sm relative">
          <div className="max-w-lg mx-auto">
            <div className="absolute top-4 right-4 z-10">
              <Link href={`/${tenant.slug}/admin/login`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">Admin</Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              {hero.show_logo && tenant.logo_url && (
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 scale-110 rounded-full opacity-10" style={{ backgroundColor: primary }} />
                  <img src={tenant.logo_url} alt={appName} className="w-16 sm:w-20 h-16 sm:h-20 object-cover shadow-md relative" style={{ borderRadius: br }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight tracking-tight">{heroTitle}</h1>
                {heroSubtitle && <p className="text-xs sm:text-sm text-gray-600 mt-1.5 font-medium line-clamp-2">{heroSubtitle}</p>}
              </div>
            </div>
            {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
            <div className="flex gap-3 mt-6">
              <Link href={`/${tenant.slug}/menu`} className={`flex-1 py-3 text-sm font-bold text-center text-white shadow-md hover:shadow-lg active:scale-[0.97] transition-all ${btnCls}`} style={{ backgroundColor: primary }}>
                {hero.cta_primary_text}
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`/${tenant.slug}/reservas`} className={`flex-1 py-3 text-sm font-bold text-center border-2 hover:bg-gray-50 active:scale-[0.97] transition-all ${btnCls}`} style={{ borderColor: primary, color: primary }}>
                  {hero.cta_secondary_text}
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : hero.style === 'split' ? (
        /* Split Hero */
        <div className="bg-white">
          <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-5" style={{ minHeight: heroH }}>
            <div className="sm:col-span-2 relative overflow-hidden h-48 sm:h-auto">
              {heroImage ? (
                <img src={heroImage} alt={appName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(160deg, ${primary}ee 0%, ${primary}88 100%)` }} />
              )}
            </div>
            <div className="sm:col-span-3 flex flex-col justify-center p-4 sm:p-6 relative">
              <div className="absolute top-4 right-4">
                <Link href={`/${tenant.slug}/admin/login`} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Admin</Link>
              </div>
              {hero.show_logo && tenant.logo_url && (
                <img src={tenant.logo_url} alt={appName} className="w-14 h-14 object-cover mb-3 shadow-sm" style={{ borderRadius: br }} />
              )}
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-1">{heroTitle}</h1>
              {heroSubtitle && <p className="text-sm text-gray-500 mb-4">{heroSubtitle}</p>}
              {hero.show_info_pills && <InfoPills settings={settings} primary={primary} />}
              <div className="flex gap-3 mt-5">
                <Link href={`/${tenant.slug}/menu`} className={`flex-1 py-3 text-sm font-bold text-center text-white shadow-md active:scale-[0.97] transition-transform ${btnCls}`} style={{ backgroundColor: primary }}>
                  {hero.cta_primary_text}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Image / Gradient / Parallax Hero - Professional */
        <div className="relative overflow-hidden" style={{ height: heroH, minHeight: '280px' }}>
          {heroImage ? (
            <img src={heroImage} alt={appName} className={`w-full h-full object-cover ${hero.style === 'parallax' ? 'scale-110' : ''}`} />
          ) : (
            <div className="w-full h-full" style={{
              background: hero.style === 'gradient'
                ? `linear-gradient(${hero.gradient_angle || 135}deg, ${primary} 0%, ${secondary || '#10B981'}cc 50%, #0f172a 100%)`
                : `linear-gradient(135deg, ${primary}f2 0%, ${primary}cc 40%, #1e3a8a 100%)`,
            }} />
          )}
          <div className="absolute inset-0 backdrop-blur-[0.5px]" style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.35) 100%)`,
          }} />
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10">
            <Link href={`/${tenant.slug}/admin/login`} className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/40 hover:bg-white/30 transition-all shadow-sm">Admin</Link>
          </div>
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 sm:pb-8 max-w-lg mx-auto">
            {hero.show_logo && tenant.logo_url && (
              <div className="mb-3 sm:mb-5 relative">
                <div className="absolute inset-0 scale-125 rounded-2xl opacity-20 blur" style={{ backgroundColor: '#fff' }} />
                <img src={tenant.logo_url} alt={appName} className="w-16 sm:w-20 h-16 sm:h-20 object-cover shadow-xl border-3 border-white/40 relative rounded-2xl" />
              </div>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 sm:mb-2 leading-tight tracking-tight drop-shadow-lg">{heroTitle}</h1>
            {heroSubtitle && <p className="text-white/90 text-xs sm:text-base mb-3 sm:mb-6 font-semibold line-clamp-2 sm:line-clamp-3 drop-shadow">{heroSubtitle}</p>}
            {hero.show_info_pills && (
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-6">
                {settings?.delivery_enabled && (
                  <span className="flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/30">🚗 {settings.delivery_time_minutes ?? 30}min</span>
                )}
                {settings?.city && (
                  <span className="flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/30">📍 {settings.city}</span>
                )}
                {settings?.cash_payment_enabled && (
                  <span className="flex items-center gap-1 px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/30">💳 Múltiples</span>
                )}
              </div>
            )}
            <div className="flex gap-2 sm:gap-3">
              <Link href={`/${tenant.slug}/menu`} className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center text-white shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all ${btnCls}`} style={{ backgroundColor: primary }}>
                {hero.cta_primary_text}
              </Link>
              {settings?.reservations_enabled && (
                <Link href={`/${tenant.slug}/reservas`} className={`flex-1 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center bg-white/25 backdrop-blur-md text-white border border-white/50 hover:bg-white/35 active:scale-[0.97] transition-all ${btnCls}`}>
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
            return <FeaturedSection key={section.id} tenantId={tenant.slug} items={featured || []} primary={primary} title={sTitle || 'Lo más pedido'} borderRadius={br} cardClasses={cardCls} animations={anim} />
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
            return settings ? <ActionsSection key={section.id} tenantId={tenant.slug} settings={settings} primary={primary} borderRadius={br} /> : null
          case 'social':
            return <SocialSection key={section.id} social={social} primary={primary} title={sTitle || 'Síguenos'} borderRadius={br} />
          default:
            return null
        }
      })}

      {/* Professional Footer */}
      <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 px-4">
        <div className="max-w-lg mx-auto space-y-3 sm:space-y-4 pb-4">
          <div className="text-center space-y-1 sm:space-y-2">
            {footer.custom_text && <p className="text-xs sm:text-sm font-medium text-gray-700">{footer.custom_text}</p>}
            <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
              © {new Date().getFullYear()} {appName}
            </p>
          </div>
          {footer.show_powered_by && (
            <div className="pt-2 text-center border-t border-gray-200">
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Por <span className="text-blue-600 font-semibold">Eccofood</span></p>
            </div>
          )}
        </div>
      </div>

      <BottomNav tenantId={tenant.slug} primaryColor={primary} />
    </div>
  )
}

function InfoPills({ settings, primary }: { settings: any; primary: string }) {
  if (!settings) return null
  return (
    <div className="flex flex-wrap gap-2">
      {settings.delivery_enabled && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm" style={{ backgroundColor: `${primary}15`, color: primary, border: `1px solid ${primary}30` }}>
          🚗 {settings.delivery_time_minutes ?? 30} min
        </span>
      )}
      {settings.city && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
          📍 {settings.city}
        </span>
      )}
    </div>
  )
}
