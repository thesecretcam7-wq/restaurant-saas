import { createServiceClient } from '@/lib/supabase/server'
import { getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import KioskoClient from './KioskoClient'
import KioskoBrandingProvider from './KioskoBrandingProvider'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ confirmado?: string; num?: string; name?: string }>
}

export default async function KioskoPage({ params, searchParams }: Props) {
  const { domain } = await params
  const { confirmado, num, name } = await searchParams

  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name, stripe_account_id, stripe_account_status, logo_url, metadata, country')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-2xl">
        Restaurante no encontrado
      </div>
    )
  }

  const [context, categoriesRes, itemsRes, toppingsRes, settingsRes, bannersRes] = await Promise.all([
    getTenantContext(domain),
    supabase
      .from('menu_categories')
      .select('id, name, sort_order, image_url')
      .eq('tenant_id', tenant.id)
      .order('sort_order'),
    supabase
      .from('menu_items')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('product_toppings')
      .select('id, menu_item_id, name, price, sort_order')
      .eq('tenant_id', tenant.id)
      .order('sort_order')
      .then(res => res, () => ({ data: [] })),
    supabase
      .from('restaurant_settings')
      .select('tax_rate, currency_symbol, country')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
    supabase
      .from('kiosko_banners')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('sort_order'),
  ])

  const contextBranding = (context.branding || {}) as Record<string, any>
  const pageConfig = getPageConfig((context.tenant as any)?.metadata?.page_config || contextBranding.page_config)
  const isLightTheme = pageConfig.appearance.theme_mode === 'light'

  const branding = {
    appName: contextBranding.app_name || tenant.organization_name,
    primaryColor: isLightTheme ? '#ff5a00' : '#D4AF37',
    secondaryColor: isLightTheme ? '#ffffff' : '#1A1F2C',
    accentColor: isLightTheme ? '#ff1f1f' : '#D4AF37',
    backgroundColor: isLightTheme ? '#ffffff' : '#0B0E14',
    buttonPrimaryColor: isLightTheme ? '#ff5a00' : '#D35A37',
    buttonSecondaryColor: isLightTheme ? '#ff1f1f' : '#D4AF37',
    textPrimaryColor: isLightTheme ? '#07111f' : '#ffffff',
    textSecondaryColor: isLightTheme ? 'rgba(7, 17, 31, 0.70)' : '#8b97a8',
    borderColor: isLightTheme ? 'rgba(7, 17, 31, 0.12)' : 'rgba(212, 175, 55, 0.18)',
    isLightTheme,
    logoUrl:
      tenant.logo_url ||
      contextBranding.logo_url ||
      contextBranding.favicon_url ||
      null,
  }

  const initialConfirmed =
    confirmado === 'true' && num
      ? { number: parseInt(num), name: name ? decodeURIComponent(name) : 'Cliente' }
      : undefined
  const currencyCountry = settingsRes.data?.country || tenant.country || 'ES'
  const currencyInfo = getCurrencyByCountry(currencyCountry)

  return (
    <KioskoBrandingProvider branding={branding}>
      <KioskoClient
        tenantId={tenant.id}
        domain={domain}
        branding={branding}
        categories={categoriesRes.data || []}
        menuItems={itemsRes.data || []}
        toppings={toppingsRes.data || []}
        banners={bannersRes.data || []}
        taxRate={Number(settingsRes.data?.tax_rate || 0)}
        currencyCode={currencyInfo.code}
        currencyLocale={currencyInfo.locale}
        stripeEnabled={!!tenant.stripe_account_id && tenant.stripe_account_status === 'verified'}
        initialConfirmed={initialConfirmed}
      />
    </KioskoBrandingProvider>
  )
}
