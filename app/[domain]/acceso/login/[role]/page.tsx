import { createServiceClient } from '@/lib/supabase/server'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { RoleLoginClient } from './RoleLoginClient'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ domain: string; role: string }>
}

const ROLE_LOGIN_BOOT_TIMEOUT_MS = 2500

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = ROLE_LOGIN_BOOT_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain: slug, role } = await params

  if (role !== 'camarero') {
    return {}
  }

  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const tenantResult = await withTimeout(
    supabase
      .from('tenants')
      .select('organization_name, slug')
      .eq(isUUID ? 'id' : 'slug', slug)
      .single(),
    1200
  )
  const tenant = tenantResult?.data

  const tenantSlug = tenant?.slug || slug
  const restaurantName = tenant?.organization_name || 'Restaurante'

  return {
    title: `Camarero | ${restaurantName}`,
    applicationName: `${restaurantName} Camarero`,
    manifest: `/${tenantSlug}/manifest.webmanifest?screen=waiter`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: `${restaurantName} Camarero`,
    },
    other: {
      'apple-mobile-web-app-title': `${restaurantName} Camarero`,
      'mobile-web-app-capable': 'yes',
    },
  }
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

  const tenantResult = await withTimeout(
    supabase
      .from('tenants')
      .select('id, slug, organization_name, logo_url, metadata')
      .eq(isUUID ? 'id' : 'slug', slug)
      .single()
  )
  const tenant = tenantResult?.data

  const brandingResult = tenant
    ? await withTimeout(
        supabase
          .from('tenant_branding')
          .select('app_name, primary_color, secondary_color, accent_color, background_color, button_primary_color, button_secondary_color, text_primary_color, text_secondary_color, border_color, logo_url, metadata')
          .eq('tenant_id', tenant.id)
          .maybeSingle(),
        1200
      )
    : null
  const branding = brandingResult?.data

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-danger)' }}>
        Restaurante no encontrado
      </div>
    )
  }

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

  // Fetch staff members for this tenant filtered by the selected role
  const staffResult = await withTimeout(
    supabase
      .from('staff_members')
      .select('id, name, role')
      .eq('tenant_id', tenant.id)
      .eq('role', role)
      .eq('is_active', true)
      .order('name'),
    1800
  )
  const staffMembers = staffResult?.data

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
