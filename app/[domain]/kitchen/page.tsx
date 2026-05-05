import { createServiceClient } from '@/lib/supabase/server'
import { KitchenClient } from './KitchenClient'

interface Props {
  params: Promise<{ domain: string }>
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

  const [{ data: settings }, { data: branding }] = tenant
    ? await Promise.all([
        supabase
          .from('restaurant_settings')
          .select('country')
          .eq('tenant_id', tenant.id)
          .maybeSingle(),
        supabase
          .from('tenant_branding')
          .select('app_name, primary_color, secondary_color, accent_color, background_color, button_primary_color, button_secondary_color, text_primary_color, text_secondary_color, logo_url')
          .eq('tenant_id', tenant.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }]

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
        primaryColor: branding?.primary_color || '#15130f',
        secondaryColor: branding?.secondary_color || '#111827',
        accentColor: branding?.accent_color || branding?.primary_color || '#e43d30',
        backgroundColor: branding?.background_color || '#f6f3ed',
        buttonPrimaryColor: branding?.button_primary_color || branding?.primary_color || '#15130f',
        buttonSecondaryColor: branding?.button_secondary_color || branding?.secondary_color || '#111827',
        textPrimaryColor: branding?.text_primary_color || '#15130f',
        textSecondaryColor: branding?.text_secondary_color || '#6b7280',
        logoUrl: branding?.logo_url || null,
      }}
    />
  )
}
