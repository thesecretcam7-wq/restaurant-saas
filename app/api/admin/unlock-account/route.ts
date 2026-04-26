import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, daysToAdd = 30, action = 'extend_trial' } = body

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

    // Get current tenant info
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, owner_email, organization_name, status, trial_ends_at')
      .eq('id', tenantId)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    let updateData: any = {}

    if (action === 'extend_trial') {
      // Extend trial by daysToAdd days
      const newTrialEndsAt = new Date(tenant.trial_ends_at || new Date())
      newTrialEndsAt.setDate(newTrialEndsAt.getDate() + daysToAdd)
      updateData = {
        trial_ends_at: newTrialEndsAt.toISOString(),
        status: 'trial', // Ensure it's in trial status
      }
    } else if (action === 'activate_subscription') {
      // Mark as active subscription (paid)
      const subscriptionEndsAt = new Date()
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30) // 30 days subscription
      updateData = {
        status: 'active',
        trial_ends_at: null,
        subscription_plan: 'basic', // Default plan
      }
    }

    // Update tenant
    const { error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)

    if (updateError) {
      console.error('Error unlocking account:', updateError)
      return NextResponse.json({ error: 'Error al desbloquear cuenta' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Cuenta desbloqueada: ${tenant.organization_name}`,
      tenant: {
        id: tenant.id,
        organization_name: tenant.organization_name,
        owner_email: tenant.owner_email,
      },
    })
  } catch (error) {
    console.error('Unlock account error:', error)
    return NextResponse.json({ error: 'Error al procesar solicitud' }, { status: 500 })
  }
}
