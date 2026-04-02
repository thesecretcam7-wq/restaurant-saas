import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, operating_hours } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('restaurant_settings')
      .update({ operating_hours, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
    return NextResponse.json({ success: true, data, message: 'Horarios actualizados' })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('restaurant_settings')
    .select('operating_hours')
    .eq('tenant_id', tenantId)
    .single()

  return NextResponse.json({ success: true, data })
}
