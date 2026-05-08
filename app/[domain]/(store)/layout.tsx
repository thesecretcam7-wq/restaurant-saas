import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import { deriveBrandPalette } from '@/lib/brand-colors'
import BottomNav from '@/components/store/BottomNav'
import WhatsAppFloat from '@/components/store/WhatsAppFloat'
import StoreClosed from '@/components/store/StoreClosed'
import StoreBrandingMemory from '@/components/store/StoreBrandingMemory'

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

  if (tenant && !storeEnabled) {
    return (
      <StoreClosed
        tenantSlug={tenantSlug}
        restaurantName={restaurantName}
        logoUrl={tenant.logo_url}
        primaryColor={branding?.primary_color}
      />
    )
  }

  return (
    <div
      className="pb-[72px]"
      style={{
        '--primary-color': palette.primary,
        '--secondary-color': palette.secondary,
        '--button-primary-color': palette.buttonPrimary,
        '--button-secondary-color': palette.buttonSecondary,
        '--brand-surface-color': palette.surface,
        '--brand-soft-color': palette.neutralSoft,
        '--brand-text-color': palette.text,
        '--brand-muted-color': palette.mutedText,
      } as React.CSSProperties}
    >
      <StoreBrandingMemory
        appName={restaurantName}
        logoUrl={storeLogoUrl}
        primaryColor={branding?.primary_color}
      />
      {children}
      <BottomNav tenantId={tenantSlug} primaryColor={branding?.primary_color} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={restaurantName} primaryColor="#25D366" />
    </div>
  )
}
