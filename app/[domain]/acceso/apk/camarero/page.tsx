import { createServiceClient } from '@/lib/supabase/server'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { ApkWaiterLoginClient } from './ApkWaiterLoginClient'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ staffId?: string }>
}

export default async function ApkWaiterLoginPage({ params, searchParams }: Props) {
  const { domain: slug } = await params
  const { staffId } = await searchParams
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, logo_url, metadata')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0E14] px-6 text-center text-xl font-black text-red-300">
        Restaurante no encontrado
      </div>
    )
  }

  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('app_name, primary_color, secondary_color, accent_color, background_color, button_primary_color, button_secondary_color, text_primary_color, text_secondary_color, border_color, logo_url, metadata')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const metadataBranding = (tenant.metadata || {}) as Record<string, any>
  const advancedBranding = {
    ...metadataBranding,
    ...((branding?.metadata || {}) as Record<string, any>),
  }

  const palette = deriveBrandPalette({
    primary: branding?.primary_color || advancedBranding.primary_color,
    secondary: branding?.secondary_color || advancedBranding.secondary_color,
    accent: branding?.accent_color || advancedBranding.accent_color,
    background: branding?.background_color || advancedBranding.background_color,
    surface: advancedBranding.section_background_color,
    buttonPrimary: branding?.button_primary_color || advancedBranding.button_primary_color,
    buttonSecondary: branding?.button_secondary_color || advancedBranding.button_secondary_color,
    textPrimary: branding?.text_primary_color || advancedBranding.text_primary_color,
    textSecondary: branding?.text_secondary_color || advancedBranding.text_secondary_color,
    border: branding?.border_color || advancedBranding.border_color,
  })

  const { data: staffMembers } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('tenant_id', tenant.id)
    .eq('role', 'camarero')
    .eq('is_active', true)
    .order('name')

  const selectedStaff = (staffMembers || []).find((staff) => staff.id === staffId) || null

  return (
    <ApkWaiterLoginClient
      tenantId={tenant.id}
      tenantName={tenant.organization_name}
      tenantSlug={tenant.slug || slug}
      logoUrl={branding?.logo_url || tenant.logo_url}
      staffMembers={staffMembers || []}
      initialStaffId={selectedStaff?.id || ''}
      initialStaffName={selectedStaff?.name || ''}
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
