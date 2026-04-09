import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { domain, pin, role } = await request.json()

    if (!domain || !pin || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!['waiter', 'kitchen'].includes(role)) {
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

    // Get restaurant settings to check PIN
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('waiter_pin, kitchen_pin')
      .eq('tenant_id', tenant.id)
      .single()

    if (!settings) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 })
    }

    const expectedPin = role === 'waiter' ? settings.waiter_pin : settings.kitchen_pin

    if (!expectedPin) {
      return NextResponse.json(
        { error: 'PIN no configurado. Configúralo en el panel de administración.' },
        { status: 400 }
      )
    }

    if (pin !== expectedPin) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    return NextResponse.json({ success: true, role, tenantId: tenant.id })
  } catch (err) {
    console.error('Staff auth error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
