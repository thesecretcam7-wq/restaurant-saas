import { getTenantBySlugOrId } from '@/lib/getTenant'
import { createServiceClient } from '@/lib/supabase/server'
import { StaffManagement } from './StaffManagement'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function PersonalPage({ params }: Props) {
  const { domain: slugOrId } = await params
  const tenant = await getTenantBySlugOrId(slugOrId)

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Restaurante no encontrado</p>
      </div>
    )
  }

  const supabase = createServiceClient()
  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, name, role, pin, is_active, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Personal</h1>
        <p className="text-gray-500 text-sm mt-1">Administra empleados y sus PINs de acceso</p>
      </div>

      <StaffManagement tenantId={tenant.id} initialStaff={staff || []} />
    </div>
  )
}
