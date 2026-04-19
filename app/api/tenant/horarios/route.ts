import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, operating_hours } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

    const supabase = createServiceClient()

    // First, try to update existing record
    const { data: existingData, error: checkError } = await supabase
      .from('restaurant_settings')
      .select('id')
      .eq('tenant_id', tenantId)
      .single()

    let result
    if (existingData) {
      // Update existing record
      result = await supabase
        .from('restaurant_settings')
        .update({ operating_hours, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .select()
        .single()
    } else {
      // Insert new record
      result = await supabase
        .from('restaurant_settings')
        .insert({
          tenant_id: tenantId,
          operating_hours,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Error saving hours:', result.error)
      return NextResponse.json({ error: 'Error al guardar horarios' }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data, message: 'Horarios actualizados' })
  } catch (error) {
    console.error('PUT /api/tenant/horarios error:', error)
    return NextResponse.json({ error: 'Error interno al guardar horarios' }, { status: 500 })
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
