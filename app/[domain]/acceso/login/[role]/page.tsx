import { createServiceClient } from '@/lib/supabase/server'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { RoleLoginClient } from './RoleLoginClient'

interface Props {
  params: Promise<{ domain: string; role: string }>
}

export default async function RoleLoginPage({ params }: Props) {
  const { domain: slug, role } = await params

  if (!['cocinero', 'camarero', 'cajero', 'admin'].includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-danger)' }}>
        Rol inválido
      </div>
    )
  }

  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, logo_url')
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
      <div className="min-h-screen flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-danger)' }}>
        Restaurante no encontrado
      </div>
    )
  }

  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
  })

  // Fetch staff members for this tenant filtered by the selected role
  const { data: staffMembers } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('tenant_id', tenant.id)
    .eq('role', role)
    .eq('is_active', true)
    .order('name')

  return (
    <RoleLoginClient
      tenantId={tenant.id}
      tenantName={tenant.organization_name}
      tenantSlug={tenant.slug || slug}
      logoUrl={branding?.logo_url || tenant.logo_url}
      role={role as 'cocinero' | 'camarero' | 'cajero' | 'admin'}
      staffMembers={staffMembers || []}
      branding={{
        appName: branding?.app_name || tenant.organization_name,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        backgroundColor: palette.background,
        textPrimaryColor: palette.pageText,
        textSecondaryColor: palette.mutedText,
      }}
    />
  )
}
