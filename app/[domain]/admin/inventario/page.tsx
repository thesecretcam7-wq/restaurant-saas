import { createClient } from '@/lib/supabase/server'
import { InventoryManager } from '@/components/admin/InventoryManager'

interface Props { params: Promise<{ domain: string }> }

export default async function InventoryPage({ params }: Props) {
  const { domain } = await params
  const supabase = await createClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) return <div className="flex items-center justify-center h-64 text-gray-400">Error al cargar inventario</div>
  return <InventoryManager tenantId={tenant.id} />
}
