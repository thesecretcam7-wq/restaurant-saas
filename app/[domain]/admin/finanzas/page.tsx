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
          <h1 className="admin-title">Asistente financiero</h1>
          <p className="admin-subtitle">Separa dinero para proveedores, impuestos, operacion, comisiones y caja de seguridad.</p>
        </div>
      </div>
      <FinancialAssistant tenantId={tenantId} tenantSlug={domain} />
    </div>
  )
}
