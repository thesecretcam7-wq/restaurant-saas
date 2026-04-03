import Link from 'next/link'
import { PLANS, type PlanId } from '@/lib/plans'

interface Props {
  tenantId: string
  feature: string          // human readable name, e.g. "Analíticas de ventas"
  requiredPlan: PlanId     // minimum plan needed
  currentPlan: PlanId      // tenant's current plan
  children: React.ReactNode
}

const PLAN_ORDER: PlanId[] = ['trial', 'basic', 'pro', 'premium']

const PLAN_ICONS: Record<PlanId, string> = {
  trial: '🎯',
  basic: '⭐',
  pro: '🚀',
  premium: '💎',
}

export default function UpgradeGate({ tenantId, feature, requiredPlan, currentPlan, children }: Props) {
  const currentIdx = PLAN_ORDER.indexOf(currentPlan)
  const requiredIdx = PLAN_ORDER.indexOf(requiredPlan)
  const needsUpgrade = currentIdx < requiredIdx

  if (!needsUpgrade) return <>{children}</>

  const plan = PLANS[requiredPlan]

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40 overflow-hidden max-h-96">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl shadow-xl border p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl mx-auto mb-4">
            {PLAN_ICONS[requiredPlan]}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {feature}
          </h3>
          <p className="text-sm text-gray-500 mb-1">
            Disponible desde el plan
          </p>
          <p className="text-xl font-bold text-gray-900 mb-1">
            {plan.label}
          </p>
          <p className="text-sm text-orange-600 font-semibold mb-5">
            {plan.price}
          </p>
          <Link
            href={`/${tenantId}/admin/configuracion/planes`}
            className="block w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Ver planes y actualizar
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Plan actual: {PLANS[currentPlan].label}
          </p>
        </div>
      </div>
    </div>
  )
}
