import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
      .select('id, status, subscription_plan, subscription_stripe_id, created_at')
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

    // Trial period: 14 days from creation
    const createdAt = new Date(tenant.created_at)
    const now = new Date()
    const trialDays = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const isTrialActive = trialDays < 14

    // Active subscription check
    const hasActiveSubscription =
      tenant.status === 'active' &&
      tenant.subscription_plan &&
      tenant.subscription_stripe_id

    return {
      hasActiveSubscription: hasActiveSubscription || isTrialActive,
      status: tenant.status,
      plan: tenant.subscription_plan,
      isTrialActive,
      trialDaysLeft: Math.max(0, 14 - trialDays),
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
