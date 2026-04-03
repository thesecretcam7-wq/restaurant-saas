import { getTenantPlanInfo } from '@/lib/checkPlan'
import UpgradeGate from '@/components/admin/UpgradeGate'
import DominioForm from './DominioForm'

interface Props { params: Promise<{ domain: string }> }

export default async function DominioPage({ params }: Props) {
  const { domain: tenantId } = await params
  const planInfo = await getTenantPlanInfo(tenantId)

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Dominio personalizado"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      <DominioForm tenantId={tenantId} />
    </UpgradeGate>
  )
}
