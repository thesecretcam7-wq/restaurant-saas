import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, employee_name, role, pin } = await request.json()

    if (!tenantId || !employee_name || !role || !pin) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('staff_sessions')
      .insert({
        tenant_id: tenantId,
        employee_name,
        role,
        pin,
        login_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Session log error:', error)
      return NextResponse.json({ error: 'Error al registrar sesión' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Session log error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
