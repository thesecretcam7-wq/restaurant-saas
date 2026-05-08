import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getTenantAccessInfo } from './tenant-access'

export async function getTenantSubscriptionStatus(tenantId: string) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, status, subscription_plan, subscription_stripe_id, subscription_expires_at, trial_ends_at, created_at')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      return {
        hasActiveSubscription: false,
        status: 'unknown',
        plan: null,
        reason: 'Tenant not found',
      }
    }

    const access = getTenantAccessInfo(tenant)
    const isTrialActive = access.reason === 'trial_active'
    const hasActiveSubscription = access.reason === 'subscription_active'

    return {
      hasActiveSubscription: access.allowed,
      status: tenant.status,
      plan: tenant.subscription_plan,
      isTrialActive,
      trialDaysLeft: access.trialDaysRemaining,
      reason: isTrialActive
        ? null
        : !hasActiveSubscription
          ? 'No active subscription'
          : null,
    }
  } catch (error) {
    console.error('Error checking subscription:', error)
    return {
      hasActiveSubscription: false,
      status: 'error',
      plan: null,
      reason: 'Error checking subscription',
    }
  }
}

export async function getSubscriptionPlans() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('monthly_price', { ascending: true })

    return plans || []
  } catch (error) {
    console.error('Error fetching plans:', error)
    return []
  }
}
