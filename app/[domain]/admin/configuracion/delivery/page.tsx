import { getTenantPlanInfo } from '@/lib/checkPlan'
import UpgradeGate from '@/components/admin/UpgradeGate'
import DeliveryForm from './DeliveryForm'

interface Props { params: Promise<{ domain: string }> }

export default async function DeliveryConfigPage({ params }: Props) {
  const { domain: tenantId } = await params
  const planInfo = await getTenantPlanInfo(tenantId)

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Delivery a domicilio"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      <DeliveryForm tenantId={tenantId} />
    </UpgradeGate>
  )
}
