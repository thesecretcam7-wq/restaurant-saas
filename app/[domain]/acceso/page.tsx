import { createServiceClient } from '@/lib/supabase/server'
import { RoleSelector } from './RoleSelector'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function AccesoPage({ params }: Props) {
  const { domain: slug } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name, logo_url')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  const { data: branding } = tenant
    ? await supabase
        .from('tenant_branding')
        .select('app_name, primary_color, secondary_color, accent_color, background_color, text_primary_color, text_secondary_color, logo_url')
        .eq('tenant_id', tenant.id)
        .maybeSingle()
    : { data: null }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return (
    <RoleSelector
      tenantId={tenant.id}
      tenantName={tenant.organization_name}
      tenantSlug={slug}
      logoUrl={branding?.logo_url || tenant.logo_url}
      branding={{
        appName: branding?.app_name || tenant.organization_name,
        primaryColor: branding?.primary_color || '#E4002B',
        secondaryColor: branding?.secondary_color || '#111827',
        accentColor: branding?.accent_color || branding?.primary_color || '#E4002B',
        backgroundColor: branding?.background_color || '#0b0b0b',
        textPrimaryColor: branding?.text_primary_color || '#ffffff',
        textSecondaryColor: branding?.text_secondary_color || '#d1d5db',
      }}
    />
  )
}
