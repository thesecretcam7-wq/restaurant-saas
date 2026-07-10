import { createClient } from '@/lib/supabase/server'
import { PurchaseControlManager } from '@/components/admin/PurchaseControlManager'
import { ClipboardList } from 'lucide-react'

interface Props { params: Promise<{ domain: string }> }

export default async function PurchasesPage({ params }: Props) {
  const { domain } = await params
  const supabase = await createClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) return <div className="admin-empty">Error al cargar compras</div>

  return (
    <div className="admin-page purchases-admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Compras</p>
          <h1 className="admin-title">Control de facturas y precios</h1>
          <p className="admin-subtitle">Registra compras de proveedores y compara el precio real por unidad, kilo o litro.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <ClipboardList className="size-5" />
        </span>
      </div>
      <PurchaseControlManager tenantId={tenant.id} />
    </div>
  )
}
