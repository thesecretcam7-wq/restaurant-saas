import { createServiceClient } from '@/lib/supabase/server'
import { KitchenClient } from './KitchenClient'
import { getTenantContext } from '@/lib/tenant'
import { deriveBrandPalette } from '@/lib/brand-colors'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  const context = tenant ? await getTenantContext(tenant.slug || slug) : null
  const settings = context?.settings
  const branding = context?.branding
  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    surface: branding?.section_background_color,
    buttonPrimary: branding?.button_primary_color,
    buttonSecondary: branding?.button_secondary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })

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
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        backgroundColor: palette.background,
        surfaceColor: palette.surface,
        buttonPrimaryColor: palette.buttonPrimary,
        buttonSecondaryColor: palette.buttonSecondary,
        textPrimaryColor: palette.pageText,
        textSecondaryColor: palette.mutedText,
        logoUrl: branding?.logo_url || null,
      }}
    />
  )
}
