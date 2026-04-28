import { createServiceClient } from '@/lib/supabase/server'
import KioskoClient from './KioskoClient'

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
    .select('id, organization_name, stripe_account_id')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-2xl">
        Restaurante no encontrado
      </div>
    )
  }

  const [brandingRes, categoriesRes, itemsRes, settingsRes] = await Promise.all([
    supabase
      .from('tenant_branding')
      .select('app_name, primary_color, logo_url: favicon_url')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
    supabase
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('menu_items')
      .select('id, name, description, price, image_url, available, category_id, featured')
      .eq('tenant_id', tenant.id)
      .eq('available', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('restaurant_settings')
      .select('tax_rate, currency_symbol')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ])

  const branding = {
    appName: brandingRes.data?.app_name || tenant.organization_name,
    primaryColor: '#E4002B', // EccoFood red - always use brand colors for kiosko
    logoUrl: (brandingRes.data as any)?.logo_url || null,
  }

  const initialConfirmed =
    confirmado === 'true' && num
      ? { number: parseInt(num), name: name ? decodeURIComponent(name) : 'Cliente' }
      : undefined

  return (
    <KioskoClient
      tenantId={tenant.id}
      domain={domain}
      branding={branding}
      categories={categoriesRes.data || []}
      menuItems={itemsRes.data || []}
      taxRate={settingsRes.data?.tax_rate || 0}
      currencySymbol={settingsRes.data?.currency_symbol || '$'}
      stripeEnabled={!!tenant.stripe_account_id}
      initialConfirmed={initialConfirmed}
    />
  )
}
