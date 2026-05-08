import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantAccessInfo } from '@/lib/tenant-access'

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

    // Usar createClient directo (sin SSR) con service role key para bypasear RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Buscar tenant: si el domain es UUID buscamos por id, si no por slug o primary_domain
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

    let tenant = null

    if (isUUID) {
      const { data } = await supabase
        .from('tenants')
        .select('id, status, subscription_plan, subscription_stripe_id, subscription_expires_at, trial_ends_at, created_at')
        .eq('id', domain)
        .maybeSingle()
      tenant = data
    } else {
      // Buscar por primary_domain primero, luego por slug
      const { data: byDomain } = await supabase
        .from('tenants')
        .select('id, status, subscription_plan, subscription_stripe_id, subscription_expires_at, trial_ends_at, created_at')
        .eq('primary_domain', domain)
        .maybeSingle()
      tenant = byDomain

      if (!tenant) {
        const { data: bySlug } = await supabase
          .from('tenants')
          .select('id, status, subscription_plan, subscription_stripe_id, subscription_expires_at, trial_ends_at, created_at')
          .eq('slug', domain)
          .maybeSingle()
        tenant = bySlug
      }
    }

    if (!tenant) {
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

    const access = getTenantAccessInfo(tenant)
    const isTrialActive = access.reason === 'trial_active'

    return NextResponse.json({
      hasActiveSubscription: access.allowed,
      status: tenant.status,
      plan: tenant.subscription_plan,
      isTrialActive,
      trialDaysLeft: access.trialDaysRemaining,
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
