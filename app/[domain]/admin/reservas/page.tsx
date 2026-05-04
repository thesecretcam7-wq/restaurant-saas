import { getTenantPlanInfo } from '@/lib/checkPlan'
import { getTenantIdFromSlug } from '@/lib/tenant'
import UpgradeGate from '@/components/admin/UpgradeGate'
import ReservasCalendar from '@/components/admin/ReservasCalendar'
import { CalendarDays } from 'lucide-react'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function ReservasAdminPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  const planInfo = await getTenantPlanInfo(tenantId)

  return (
    <UpgradeGate
      tenantId={tenantId}
      feature="Sistema de reservas"
      requiredPlan="pro"
      currentPlan={planInfo.planId}
    >
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <p className="admin-eyebrow">Agenda</p>
            <h1 className="admin-title">Reservas</h1>
            <p className="admin-subtitle">Calendario, confirmaciones y capacidad diaria del restaurante.</p>
          </div>
          <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
            <CalendarDays className="size-5" />
          </span>
        </div>
        <div className="admin-panel p-3 sm:p-5">
          <ReservasCalendar tenantId={slug} />
        </div>
      </div>
    </UpgradeGate>
  )
}
