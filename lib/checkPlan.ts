import { createClient } from '@supabase/supabase-js'
import { PLANS, getPlanLimits, type PlanId } from './plans'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface TenantPlanInfo {
  planId: PlanId
  status: string
  limits: ReturnType<typeof getPlanLimits>
  label: string
  price: string
  isTrial: boolean
  trialActive: boolean      // trial period still running (14 days)
  isActive: boolean         // subscription active (paid) or trial running
}

export async function getTenantPlanInfo(tenantId: string): Promise<TenantPlanInfo> {
  const supabase = serviceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_plan, status, created_at')
    .eq('slug', tenantId)
    .single()

  const rawPlan = (tenant?.subscription_plan || 'basic') as PlanId
  const status = tenant?.status || 'trial'
  const isTrial = status === 'trial'

  // Trial is active for 30 days from creation
  const trialActive = isTrial && tenant?.created_at
    ? (Date.now() - new Date(tenant.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000
    : false

  // Effective plan: during active trial use trial limits (which are generous)
  const effectivePlan: PlanId = (isTrial && trialActive) ? 'trial' : rawPlan

  const isActive = status === 'active' || trialActive

  return {
    planId: effectivePlan,
    status,
    limits: getPlanLimits(effectivePlan),
    label: PLANS[effectivePlan].label,
    price: PLANS[effectivePlan].price,
    isTrial,
    trialActive,
    isActive,
  }
}

/** Returns how many orders the tenant has placed this calendar month */
export async function getMonthlyOrderCount(tenantId: string): Promise<number> {
  const supabase = serviceClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth)
    .neq('status', 'cancelled')

  return count || 0
}

/** Check if tenant can create another order this month */
export async function canCreateOrder(tenantId: string): Promise<{ allowed: boolean; reason?: string; used?: number; limit?: number }> {
  const [planInfo, used] = await Promise.all([
    getTenantPlanInfo(tenantId),
    getMonthlyOrderCount(tenantId),
  ])

  const limit = planInfo.limits.orders_per_month
  if (limit === Infinity) return { allowed: true, used, limit }

  if (used >= limit) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${limit} pedidos por mes del plan ${planInfo.label}. Actualiza tu plan para continuar recibiendo pedidos.`,
      used,
      limit,
    }
  }
  return { allowed: true, used, limit }
}

/** Check if tenant's plan includes a boolean feature */
export async function checkFeature(
  tenantId: string,
  feature: 'reservations' | 'delivery' | 'analytics' | 'custom_domain' | 'multiple_locations'
): Promise<{ allowed: boolean; reason?: string; planId: PlanId }> {
  const planInfo = await getTenantPlanInfo(tenantId)
  const allowed = planInfo.limits[feature] === true

  if (!allowed) {
    const featureNames: Record<string, string> = {
      reservations: 'el sistema de reservas',
      delivery: 'delivery a domicilio',
      analytics: 'las analíticas de ventas',
      custom_domain: 'dominio personalizado',
      multiple_locations: 'múltiples sucursales',
    }
    return {
      allowed: false,
      reason: `Tu plan ${planInfo.label} no incluye ${featureNames[feature]}. Actualiza a un plan superior para habilitarlo.`,
      planId: planInfo.planId,
    }
  }

  return { allowed: true, planId: planInfo.planId }
}
