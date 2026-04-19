import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, operating_hours } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

    const supabase = createServiceClient()

    // Use upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from('restaurant_settings')
      .upsert(
        {
          tenant_id: tenantId,
          operating_hours,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving hours:', error)
      return NextResponse.json({ error: `Error al guardar: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ success: true, data, message: 'Horarios actualizados' })
  } catch (error) {
    console.error('PUT /api/tenant/horarios error:', error)
    return NextResponse.json({ error: `Error interno: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('restaurant_settings')
    .select('operating_hours')
    .eq('tenant_id', tenantId)
    .single()

  return NextResponse.json({ success: true, data })
}
