import { getTenantPlanInfo } from '@/lib/checkPlan'
import UpgradeGate from '@/components/admin/UpgradeGate'
import ReservasForm from './ReservasForm'

interface Props { params: Promise<{ domain: string }> }

export default async function ReservasConfigPage({ params }: Props) {
  const { domain: tenantId } = await params
  const planInfo = await getTenantPlanInfo(tenantId)

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Sistema de reservas"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      <ReservasForm tenantId={tenantId} />
    </UpgradeGate>
  )
}
