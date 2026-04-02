import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter required' },
        { status: 400 }
      )
    }

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

    // Find tenant by domain
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, status, subscription_plan, subscription_stripe_id, created_at')
      .eq('primary_domain', domain)
      .single()

    if (error || !tenant) {
      return NextResponse.json(
        {
          hasActiveSubscription: false,
          status: 'not_found',
          isTrialActive: false,
          trialDaysLeft: 0,
          reason: 'Tenant not found',
        }
      )
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

    return NextResponse.json({
      hasActiveSubscription: hasActiveSubscription || isTrialActive,
      status: tenant.status,
      plan: tenant.subscription_plan,
      isTrialActive,
      trialDaysLeft: Math.max(0, 14 - trialDays),
      tenantId: tenant.id,
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        hasActiveSubscription: false,
      },
      { status: 500 }
    )
  }
}
