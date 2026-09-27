import { FinancialAssistant } from '@/components/admin/FinancialAssistant'
import { getTenantIdFromSlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ domain: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FinanzasPage({ params }: Props) {
  const { domain } = await params
  const tenantId = await getTenantIdFromSlug(domain)

  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Finanzas</p>
          <h1 className="admin-title">Planificación de caja</h1>
          <p className="admin-subtitle">Decide cuánto reservar para proveedores, impuestos, operación, comisiones y seguridad de caja.</p>
        </div>
      </div>
      <FinancialAssistant tenantId={tenantId} tenantSlug={domain} />
    </div>
  )
}
