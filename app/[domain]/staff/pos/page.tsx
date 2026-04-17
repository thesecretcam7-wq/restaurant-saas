import { createServiceClient } from '@/lib/supabase/server'
import { POSTerminal } from '@/components/admin/POSTerminal'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function StaffPOSPage({ params }: Props) {
  const { domain: slug } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return <POSTerminal tenantId={tenant.id} country="CO" />
}
