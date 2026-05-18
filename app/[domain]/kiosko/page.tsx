import { createServiceClient } from '@/lib/supabase/server'
import { getCurrencyByCountry } from '@/lib/currency'
import { getTenantContext } from '@/lib/tenant'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { getPageConfig } from '@/lib/pageConfig'
import KioskoClient from './KioskoClient'

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
  const palette = deriveBrandPalette({
    primary: contextBranding.primary_color,
    secondary: contextBranding.secondary_color,
    accent: contextBranding.accent_color,
    background: contextBranding.background_color,
    surface: contextBranding.section_background_color,
    buttonPrimary: contextBranding.button_primary_color,
    buttonSecondary: contextBranding.button_secondary_color,
    textPrimary: contextBranding.text_primary_color,
    textSecondary: contextBranding.text_secondary_color,
    border: contextBranding.border_color,
  })

  const branding = {
    appName: contextBranding.app_name || tenant.organization_name,
    primaryColor: isLightTheme ? '#00e5ff' : palette.primary,
    secondaryColor: isLightTheme ? '#b6ff00' : palette.secondary,
    accentColor: isLightTheme ? '#ff00e5' : palette.accent,
    backgroundColor: isLightTheme ? '#ffffff' : palette.background,
    buttonPrimaryColor: isLightTheme ? '#00e5ff' : palette.buttonPrimary,
    buttonSecondaryColor: isLightTheme ? '#ff00e5' : palette.buttonSecondary,
    textPrimaryColor: isLightTheme ? '#07111f' : palette.pageText,
    textSecondaryColor: isLightTheme ? 'rgba(7, 17, 31, 0.70)' : palette.mutedText,
    borderColor: isLightTheme ? 'rgba(0, 229, 255, 0.26)' : palette.border,
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
  )
}
