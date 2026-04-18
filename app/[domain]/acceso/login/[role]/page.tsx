import { createServiceClient } from '@/lib/supabase/server'
import { RoleLoginClient } from './RoleLoginClient'

interface Props {
  params: Promise<{ domain: string; role: string }>
}

export default async function RoleLoginPage({ params }: Props) {
  const { domain: slug, role } = await params

  if (!['cocinero', 'camarero', 'cajero', 'admin'].includes(role)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-xl">
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

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

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
      logoUrl={tenant.logo_url}
      role={role as 'cocinero' | 'camarero' | 'cajero' | 'admin'}
      staffMembers={staffMembers || []}
    />
  )
}
