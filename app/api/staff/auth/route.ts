import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getPermissionsByRole(supabase: any, role: string): Promise<string[]> {
  const { data } = await supabase
    .from('staff_role_permissions')
    .select('admin_permissions(key)')
    .eq('role', role)

  return data?.map((p: any) => p.admin_permissions.key) || []
}

export async function POST(request: NextRequest) {
  try {
    const { domain, pin, role } = await request.json()

    if (!domain || !pin || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!['waiter', 'kitchen', 'chef', 'manager', 'cashier', 'bartender', 'kitchen_prep'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, subscription_plan, status, created_at')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    // Check plan: pro, premium, or active trial
    const allowedPlans = ['pro', 'premium']
    const isTrial = tenant.status === 'trial'
    const isTrialActive = isTrial && tenant.created_at
      ? (Date.now() - new Date(tenant.created_at).getTime()) < 14 * 24 * 60 * 60 * 1000
      : false

    if (!isTrialActive && !allowedPlans.includes(tenant.subscription_plan || '')) {
      return NextResponse.json(
        { error: 'Esta función requiere plan Pro o Premium', requiresUpgrade: true },
        { status: 403 }
      )
    }

    // Try to find staff member by PIN first
    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('id, role, is_active')
      .eq('tenant_id', tenant.id)
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (staffMember) {
      const permissions = await getPermissionsByRole(supabase, staffMember.role)
      return NextResponse.json({ success: true, role: staffMember.role, tenantId: tenant.id, permissions })
    }

    // Fallback to old generic PIN system
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('waiter_pin, kitchen_pin')
      .eq('tenant_id', tenant.id)
      .single()

    if (!settings) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    const expectedPin = role === 'waiter' ? settings.waiter_pin : settings.kitchen_pin

    if (!expectedPin || pin !== expectedPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    // Get permissions based on role
    const permissions = await getPermissionsByRole(supabase, role)

    return NextResponse.json({
      success: true,
      role,
      tenantId: tenant.id,
      permissions
    })
  } catch (err) {
    console.error('Staff auth error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
