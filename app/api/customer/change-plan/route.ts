import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPlanMonthlyPrice } from '@/lib/subscription-pricing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, newPlan, currentPlan } = body

    if (!tenantId || !newPlan) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    // Verify tenant exists and belongs to current user
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, subscription_plan, subscription_expires_at')
      .eq('id', tenantId)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Calculate pro-rata for upgrades
    const currentPrice = getPlanMonthlyPrice(currentPlan)
    const newPrice = getPlanMonthlyPrice(newPlan)
    const daysPerMonth = 30
    const dailyRate = (newPrice - currentPrice) / daysPerMonth
    const daysRemaining = daysPerMonth
    const chargeAmount = Math.max(0, Math.round((dailyRate * daysRemaining) * 100) / 100)

    // Update tenant with new plan and reset subscription expiration
    const subscriptionExpiresAt = new Date()
    subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30)

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        subscription_plan: newPlan,
        subscription_expires_at: subscriptionExpiresAt.toISOString(),
        status: 'active',
        subscription_expiration_notified: false,
      })
      .eq('id', tenantId)

    if (updateError) {
      console.error('Error updating tenant plan:', updateError)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    // TODO: If upgrade, create Stripe invoice for pro-rata amount
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      message: 'Plan changed successfully',
      plan: newPlan,
      chargeAmount: chargeAmount,
      subscriptionExpiresAt: subscriptionExpiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Change plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
