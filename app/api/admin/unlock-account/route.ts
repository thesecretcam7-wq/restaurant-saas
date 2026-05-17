import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isOwnerEmail } from '@/lib/owner-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, daysToAdd = 30, action = 'extend_trial', plan = 'basic', deleteConfirmation = '' } = body

    if (!['basic', 'pro', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalido' }, { status: 400 })
    }

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

    const { data: { user } } = await authClient.auth.getUser()
    if (!isOwnerEmail(user?.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get current tenant info
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, owner_email, organization_name, status, trial_ends_at, metadata')
      .eq('id', tenantId)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }

    let updateData: any = {}

    if (action === 'delete_tenant') {
      const expectedConfirmation = `ELIMINAR ${tenant.organization_name}`
      if (deleteConfirmation !== expectedConfirmation) {
        return NextResponse.json({ error: 'Confirmacion incorrecta' }, { status: 400 })
      }

      const { error: deleteError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId)

      if (deleteError) {
        console.error('Error deleting tenant:', deleteError)
        return NextResponse.json({ error: 'Error al eliminar restaurante' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Restaurante eliminado: ${tenant.organization_name}`,
        deleted: true,
      })
    }

    if (action === 'extend_trial') {
      // Extend trial by daysToAdd days
      const newTrialEndsAt = new Date(tenant.trial_ends_at || new Date())
      newTrialEndsAt.setDate(newTrialEndsAt.getDate() + daysToAdd)
      updateData = {
        trial_ends_at: newTrialEndsAt.toISOString(),
        status: 'trial', // Ensure it's in trial status
      }
    } else if (action === 'activate_subscription' || action === 'timed_subscription') {
      // Manual subscription with expiration.
      const subscriptionEndsAt = new Date()
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + daysToAdd)
      updateData = {
        status: 'active',
        trial_ends_at: null,
        subscription_plan: plan,
        subscription_expires_at: subscriptionEndsAt.toISOString(),
        metadata: {
          ...(tenant.metadata || {}),
          billing_source: 'manual',
          manual_plan: plan,
          manual_expires_at: subscriptionEndsAt.toISOString(),
          manual_updated_at: new Date().toISOString(),
        },
      }
    } else if (action === 'manual_subscription') {
      // Manual account without expiration. Useful for demos, partners, comped customers, or offline payments.
      updateData = {
        status: 'active',
        trial_ends_at: null,
        subscription_plan: plan,
        subscription_expires_at: null,
        metadata: {
          ...(tenant.metadata || {}),
          billing_source: 'manual',
          manual_plan: plan,
          manual_expires_at: null,
          manual_updated_at: new Date().toISOString(),
        },
      }
    } else if (action === 'suspend') {
      updateData = {
        status: 'suspended',
        subscription_expires_at: new Date().toISOString(),
        metadata: {
          ...(tenant.metadata || {}),
          billing_source: 'manual',
          manual_suspended_at: new Date().toISOString(),
        },
      }
    } else {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
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
