import { getTenantBySlugOrId } from '@/lib/getTenant'
import { createServiceClient } from '@/lib/supabase/server'
import { StaffManagement } from './StaffManagement'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function PersonalPage({ params }: Props) {
  try {
    const { domain: slugOrId } = await params
    const tenant = await getTenantBySlugOrId(slugOrId)

    if (!tenant) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-red-500">Restaurante no encontrado</p>
        </div>
      )
    }

    const supabase = createServiceClient()
    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id, name, role, pin, is_active, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[personal] Error fetching staff:', error)
    }

    return (
      <div className="px-4 py-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="mt-1 text-sm text-gray-500">Administra empleados y sus PINs de acceso</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No pudimos cargar el listado de empleados ahora mismo, pero la pagina sigue disponible.
            Recarga en unos segundos.
          </div>
        )}

        <StaffManagement tenantId={tenant.id} initialStaff={staff || []} />
      </div>
    )
  } catch (error) {
    console.error('[personal] Page error:', error)

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">No pudimos abrir gestion de personal</h1>
          <p className="mt-2 text-sm text-gray-500">
            Recarga la pagina. Si continua, revisa que Supabase este respondiendo correctamente.
          </p>
        </div>
      </div>
    )
  }
}
