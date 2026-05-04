import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, plan } = await request.json()

    if (!email || !plan) {
      return NextResponse.json(
        { error: 'Email and plan are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get the user by email from auth
    const { data: users, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json(
        { error: 'Failed to list users: ' + authError.message },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find and update the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, subscription_plan')
      .eq('owner_id', user.id)
      .single()

    if (tenantError) {
      return NextResponse.json(
        { error: 'Tenant not found: ' + tenantError.message },
        { status: 404 }
      )
    }

    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant associated with this user' },
        { status: 404 }
      )
    }

    // Update subscription plan
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ subscription_plan: plan })
      .eq('id', tenant.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update plan: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Account upgraded to ${plan}`,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        previousPlan: tenant.subscription_plan,
        newPlan: plan,
      },
    })
  } catch (error) {
    console.error('[upgrade-account] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
