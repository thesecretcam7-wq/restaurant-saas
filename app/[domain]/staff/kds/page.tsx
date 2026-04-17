import { createServiceClient } from '@/lib/supabase/server'
import { KDSScreen } from '@/components/admin/KDSScreen'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function StaffKDSPage({ params }: Props) {
  const { domain: slug } = await params
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return <KDSScreen tenantId={tenant.id} />
}
