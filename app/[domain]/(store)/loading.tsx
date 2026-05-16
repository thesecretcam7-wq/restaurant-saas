import StoreLoadingScreen from '@/components/store/StoreLoadingScreen'
import { headers } from 'next/headers'
import { getTenantContext } from '@/lib/tenant'

export default async function StoreLoading() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-eccofood-tenant-slug') || ''
  const context = tenantSlug ? await getTenantContext(tenantSlug) : null
  const tenant = context?.tenant
  const branding = context?.branding

  return (
    <StoreLoadingScreen
      appName={branding?.app_name || tenant?.organization_name || tenantSlug || null}
      logoUrl={tenant?.logo_url || branding?.logo_url || null}
      color={branding?.button_primary_color || branding?.primary_color || undefined}
    />
  )
}
