import { createClient } from '@/lib/supabase/server'
import { InventoryManager } from '@/components/admin/InventoryManager'
import { Boxes } from 'lucide-react'

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

  if (!tenant) return <div className="admin-empty">Error al cargar inventario</div>
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Stock</p>
          <h1 className="admin-title">Inventario</h1>
          <p className="admin-subtitle">Control de existencias, compras, ventas y alertas de stock bajo.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <Boxes className="size-5" />
        </span>
      </div>
      <InventoryManager tenantId={tenant.id} />
    </div>
  )
}
