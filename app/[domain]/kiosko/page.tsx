import { createServiceClient } from '@/lib/supabase/server'
import { getCurrencyByCountry } from '@/lib/currency'
import { deriveBrandPalette } from '@/lib/brand-colors'
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

  const [brandingRes, categoriesRes, itemsRes, toppingsRes, settingsRes, bannersRes] = await Promise.all([
    supabase
      .from('tenant_branding')
      .select('app_name, primary_color, secondary_color, accent_color, background_color, button_primary_color, button_secondary_color, text_primary_color, text_secondary_color, border_color, logo_url, favicon_url')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
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

  const tenantMetadata = (tenant.metadata || {}) as Record<string, any>
  const metadataBranding = (tenantMetadata.branding || {}) as Record<string, any>
  const palette = deriveBrandPalette({
    primary: brandingRes.data?.primary_color,
    secondary: brandingRes.data?.secondary_color,
    accent: brandingRes.data?.accent_color,
    background: brandingRes.data?.background_color,
    buttonPrimary: brandingRes.data?.button_primary_color,
    buttonSecondary: brandingRes.data?.button_secondary_color,
    textPrimary: brandingRes.data?.text_primary_color,
    textSecondary: brandingRes.data?.text_secondary_color,
    border: brandingRes.data?.border_color,
  })

  const branding = {
    appName: brandingRes.data?.app_name || tenant.organization_name,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    buttonPrimaryColor: palette.buttonPrimary,
    buttonSecondaryColor: palette.buttonSecondary,
    textPrimaryColor: palette.pageText,
    textSecondaryColor: palette.mutedText,
    borderColor: palette.border,
    logoUrl:
      tenant.logo_url ||
      metadataBranding.logo_url ||
      (brandingRes.data as any)?.logo_url ||
      (brandingRes.data as any)?.favicon_url ||
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
