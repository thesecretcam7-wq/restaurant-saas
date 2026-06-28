import { createServiceClient } from '@/lib/supabase/server'
import { KitchenClient } from './KitchenClient'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ domain: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: slug } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('organization_name, slug')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  const tenantSlug = tenant?.slug || slug
  const restaurantName = tenant?.organization_name || 'Restaurante'

  return {
    title: `Comandero | ${restaurantName}`,
    applicationName: `${restaurantName} Comandero`,
    manifest: `/${tenantSlug}/manifest.webmanifest?screen=waiter`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: `${restaurantName} Comandero`,
    },
    other: {
      'apple-mobile-web-app-title': `${restaurantName} Comandero`,
      'mobile-web-app-capable': 'yes',
    },
  }
}

export default async function KitchenPage({ params }: Props) {
  const { domain: slug } = await params

  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name, slug, country')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  const context = tenant ? await getTenantContext(tenant.slug || slug) : null
  const settings = context?.settings
  const branding = context?.branding
  const pageConfig = getPageConfig((context?.tenant as any)?.metadata?.page_config || branding?.page_config)
  const isLightTheme = pageConfig.appearance.theme_mode === 'light'

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return (
    <KitchenClient
      tenantId={tenant.id}
      tenantSlug={tenant.slug || slug}
      tenantName={tenant.organization_name}
      country={settings?.country || tenant.country || 'ES'}
      branding={{
        appName: branding?.app_name || tenant.organization_name,
        primaryColor: isLightTheme ? '#ff5a00' : '#D4AF37',
        secondaryColor: isLightTheme ? '#ffffff' : '#1A1F2C',
        accentColor: isLightTheme ? '#ff1f1f' : '#D35A37',
        backgroundColor: isLightTheme ? '#ffffff' : '#0B0E14',
        surfaceColor: isLightTheme ? '#ffffff' : '#1A1F2C',
        buttonPrimaryColor: isLightTheme ? '#ff5a00' : '#D35A37',
        buttonSecondaryColor: isLightTheme ? '#ff1f1f' : '#D4AF37',
        textPrimaryColor: isLightTheme ? '#07111f' : '#ffffff',
        textSecondaryColor: isLightTheme ? 'rgba(7, 17, 31, 0.70)' : '#8b97a8',
        borderColor: isLightTheme ? 'rgba(7, 17, 31, 0.12)' : 'rgba(212, 175, 55, 0.18)',
        isLightTheme,
        logoUrl: branding?.logo_url || null,
      }}
    />
  )
}
