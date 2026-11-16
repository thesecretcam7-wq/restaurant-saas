import { cookies } from 'next/headers'
import { resolveAdminAccess } from '@/lib/admin-access'
import { InventoryManager } from '@/components/admin/InventoryManager'
import { Boxes } from 'lucide-react'

interface Props { params: Promise<{ domain: string }> }

export default async function InventoryPage({ params }: Props) {
  const { domain } = await params
  const { tenant } = await resolveAdminAccess(domain, await cookies())

  if (!tenant) return <div className="admin-empty">Error al cargar inventario</div>
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Stock</p>
          <h1 className="admin-title">Inventario</h1>
          <p className="admin-subtitle">Recibe mercancía, cuenta lo que queda y prepara la próxima compra.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <Boxes className="size-5" />
        </span>
      </div>
      <InventoryManager tenantId={tenant.id} tenantSlug={tenant.slug || domain} />
    </div>
  )
}
