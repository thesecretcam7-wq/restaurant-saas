import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import BottomNav from '@/components/store/BottomNav'
import WhatsAppFloat from '@/components/store/WhatsAppFloat'
import StoreClosed from '@/components/store/StoreClosed'

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
  const storeEnabled = (tenant as any)?.metadata?.store_enabled !== false

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
    <div className="pb-[72px]">
      {children}
      <BottomNav tenantId={tenantSlug} primaryColor={branding?.primary_color} />
      <WhatsAppFloat whatsapp={whatsappLink} restaurantName={restaurantName} primaryColor="#25D366" />
    </div>
  )
}
