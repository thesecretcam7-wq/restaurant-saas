import { calculateTrialStatus, getTrialEndsAt } from './trial'

export type TenantAccessInput = {
  status?: string | null
  subscription_plan?: string | null
  subscription_stripe_id?: string | null
  subscription_expires_at?: string | null
  trial_ends_at?: string | null
  created_at?: string | null
}

export type TenantAccessInfo = {
  allowed: boolean
  reason: 'trial_active' | 'subscription_active' | 'trial_expired' | 'subscription_expired' | 'suspended'
  trialEndsAt: string | null
  trialDaysRemaining: number
  subscriptionPlan: string | null
}

export function getTenantAccessInfo(tenant: TenantAccessInput | null | undefined): TenantAccessInfo {
  if (!tenant) {
    return {
      allowed: false,
      reason: 'suspended',
      trialEndsAt: null,
      trialDaysRemaining: 0,
      subscriptionPlan: null,
    }
  }

  const plan = tenant.subscription_plan || null
  const hasPaidPlan = Boolean(plan && plan !== 'free' && plan !== 'trial')
  const subscriptionExpiresAt = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null
  const subscriptionIsValid = hasPaidPlan && tenant.status === 'active' && (
    !subscriptionExpiresAt || subscriptionExpiresAt.getTime() > Date.now()
  )

  const trialEndDate = getTrialEndsAt(tenant.trial_ends_at, tenant.created_at)
  const trialStatus = calculateTrialStatus(trialEndDate)
  const trialIsActive = tenant.status === 'trial' && !trialStatus.isExpired

  if (subscriptionIsValid) {
    return {
      allowed: true,
      reason: 'subscription_active',
      trialEndsAt: trialEndDate?.toISOString() || null,
      trialDaysRemaining: trialStatus.daysRemaining,
      subscriptionPlan: plan,
    }
  }

  if (trialIsActive) {
    return {
      allowed: true,
      reason: 'trial_active',
      trialEndsAt: trialEndDate?.toISOString() || null,
      trialDaysRemaining: trialStatus.daysRemaining,
      subscriptionPlan: plan,
    }
  }

  return {
    allowed: false,
    reason: hasPaidPlan ? 'subscription_expired' : 'trial_expired',
    trialEndsAt: trialEndDate?.toISOString() || null,
    trialDaysRemaining: 0,
    subscriptionPlan: plan,
  }
}
