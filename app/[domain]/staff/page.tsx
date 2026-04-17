import { createServiceClient } from '@/lib/supabase/server'
import { StaffClient } from './StaffClient'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function StaffPage({ params }: Props) {
  const { domain: slug } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name, slug, logo_url')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return (
    <StaffClient
      tenantId={tenant.id}
      tenantName={tenant.organization_name}
      tenantSlug={tenant.slug}
      logoUrl={tenant.logo_url}
    />
  )
}
