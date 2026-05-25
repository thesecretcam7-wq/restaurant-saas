import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { isOwnerEmail } from '@/lib/owner-auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user: currentUser } } = await authClient.auth.getUser()
    if (!isOwnerEmail(currentUser?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, plan } = await request.json()

    if (!email || !plan || !['basic', 'pro', 'premium'].includes(plan)) {
      return NextResponse.json(
        { error: 'Email and valid plan are required' },
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

    const targetUser = users.users.find(u => u.email === email)

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find and update the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, subscription_plan')
      .eq('owner_id', targetUser.id)
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
