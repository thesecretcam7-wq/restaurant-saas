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
        primary: palette.primary,
        secondary: '#f1eadc',
        buttonPrimary: palette.buttonPrimary,
        buttonSecondary: '#ffffff',
        price: palette.accent,
        background: '#f8f5ee',
        surface: '#ffffff',
        soft: 'rgba(21, 19, 15, 0.06)',
        text: '#15130f',
        muted: 'rgba(21, 19, 15, 0.64)',
      }
    : {
        primary: '#e7b43f',
        secondary: '#191612',
        buttonPrimary: '#e7b43f',
        buttonSecondary: '#28231a',
        price: '#ffcf64',
        background: '#050505',
        surface: '#151410',
        soft: 'rgba(255, 247, 223, 0.08)',
        text: '#fff7df',
        muted: 'rgba(255, 247, 223, 0.66)',
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
        primaryColor={branding?.primary_color}
      />
      {children}
      <BottomNav tenantId={tenantSlug} primaryColor={palette.buttonPrimary} themeMode={themeMode} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={restaurantName} primaryColor="#25D366" />
    </div>
  )
}
