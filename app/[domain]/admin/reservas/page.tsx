import { getTenantPlanInfo } from '@/lib/checkPlan'
import { getTenantIdFromSlug } from '@/lib/tenant'
import UpgradeGate from '@/components/admin/UpgradeGate'
import ReservasCalendar from '@/components/admin/ReservasCalendar'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function ReservasAdminPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }

  const planInfo = await getTenantPlanInfo(tenantId)

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Sistema de reservas"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona las reservas de tu restaurante</p>
        </div>
        <ReservasCalendar tenantId={slug} />
      </div>
    </UpgradeGate>
  )
}
