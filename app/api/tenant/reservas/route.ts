import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type SupabaseClient = ReturnType<typeof createServiceClient>

async function resolveTenantId(supabase: SupabaseClient, slugOrId: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(slugOrId)) return slugOrId
  const { data } = await supabase.from('tenants').select('id').eq('slug', slugOrId).single()
  return data?.id ?? null
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId: slugOrId, ...data } = body

    if (!slugOrId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    if (data.total_tables !== undefined && (isNaN(Number(data.total_tables)) || Number(data.total_tables) < 1)) {
      return NextResponse.json({ error: 'El número de mesas debe ser al menos 1' }, { status: 400 })
    }

    if (data.seats_per_table !== undefined && (isNaN(Number(data.seats_per_table)) || Number(data.seats_per_table) < 1)) {
      return NextResponse.json({ error: 'Los asientos por mesa deben ser al menos 1' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, slugOrId)
    if (!tenantId) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    const { data: updated, error } = await supabase
      .from('restaurant_settings')
      .update({
        reservations_enabled: data.reservations_enabled,
        total_tables: Number(data.total_tables) || 10,
        seats_per_table: Number(data.seats_per_table) || 4,
        reservation_advance_hours: Number(data.reservation_advance_hours) || 24,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating reservations settings:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated, message: 'Configuración de reservas actualizada' })
  } catch (error) {
    console.error('Reservas API error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const slugOrId = request.nextUrl.searchParams.get('tenantId')
    if (!slugOrId) return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, slugOrId)
    if (!tenantId) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('reservations_enabled, total_tables, seats_per_table, reservation_advance_hours')
      .eq('tenant_id', tenantId)
      .single()

    if (error) return NextResponse.json({ error: 'Error al obtener la configuración' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
