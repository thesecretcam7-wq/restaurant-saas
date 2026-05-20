import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import { deriveBrandPalette } from '@/lib/brand-colors'
import BottomNav from '@/components/store/BottomNav'
import WhatsAppFloat from '@/components/store/WhatsAppFloat'
import StoreClosed from '@/components/store/StoreClosed'
import StoreBrandingMemory from '@/components/store/StoreBrandingMemory'
import './store-premium.css'

interface Props {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function StoreLayout({ children, params }: Props) {
  const { domain: tenantId } = await params
  const context = await getTenantContext(tenantId)
  const { branding, tenant } = context
  const tenantSlug = context.tenant?.slug || tenantId
  const pageConfig = getPageConfig((tenant as any)?.metadata?.page_config || branding?.page_config)
  const themeMode = pageConfig.appearance.theme_mode
  const whatsappLink = pageConfig.social.whatsapp || branding?.whatsapp_number || null
  const restaurantName = branding?.app_name || tenant?.organization_name || null
  const storeLogoUrl = branding?.logo_url || tenant?.logo_url || null
  const storeEnabled = (tenant as any)?.metadata?.store_enabled !== false
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
  const isLightTheme = themeMode === 'light'
  const themeVars = isLightTheme
    ? {
        primary: '#ff5a00',
        secondary: '#b6ff00',
        buttonPrimary: '#ff5a00',
        buttonSecondary: '#ff1f1f',
        price: '#ff1f1f',
        background: '#ffffff',
        surface: '#ffffff',
        soft: 'rgba(255, 90, 0, 0.10)',
        text: '#111827',
        muted: 'rgba(17, 24, 39, 0.70)',
      }
    : {
        primary: '#D4AF37',
        secondary: '#D35A37',
        buttonPrimary: '#D35A37',
        buttonSecondary: 'rgba(212, 175, 55, 0.12)',
        price: '#D4AF37',
        background: '#0B0E14',
        surface: '#1A1F2C',
        soft: 'rgba(212, 175, 55, 0.10)',
        text: '#ffffff',
        muted: '#8b97a8',
      }

  if (tenant && !storeEnabled) {
    return (
      <StoreClosed
        tenantSlug={tenantSlug}
        restaurantName={restaurantName}
        logoUrl={tenant.logo_url}
        primaryColor={palette.buttonPrimary}
      />
    )
  }

  return (
    <div
      className={`ecco-store-premium ${themeMode === 'light' ? 'ecco-store-light' : 'ecco-store-dark'} pb-[calc(6.25rem+env(safe-area-inset-bottom))]`}
      style={{
        '--primary-color': themeVars.primary,
        '--secondary-color': themeVars.secondary,
        '--button-primary-color': themeVars.buttonPrimary,
        '--button-secondary-color': themeVars.buttonSecondary,
        '--price-color': themeVars.price,
        '--brand-background-color': themeVars.background,
        '--brand-surface-color': themeVars.surface,
        '--brand-soft-color': themeVars.soft,
        '--brand-text-color': themeVars.text,
        '--brand-muted-color': themeVars.muted,
      } as React.CSSProperties}
    >
      <StoreBrandingMemory
        appName={restaurantName}
        logoUrl={storeLogoUrl}
        primaryColor={isLightTheme ? '#ff5a00' : branding?.primary_color}
      />
      {children}
      <BottomNav tenantId={tenantSlug} primaryColor={isLightTheme ? '#ff5a00' : palette.buttonPrimary} themeMode={themeMode} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={restaurantName} primaryColor="#25D366" />
    </div>
  )
}
