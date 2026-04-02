import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, ...data } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    if (data.delivery_fee !== undefined && (isNaN(Number(data.delivery_fee)) || Number(data.delivery_fee) < 0)) {
      return NextResponse.json({ error: 'El costo de delivery debe ser un número positivo' }, { status: 400 })
    }

    if (data.delivery_min_order !== undefined && (isNaN(Number(data.delivery_min_order)) || Number(data.delivery_min_order) < 0)) {
      return NextResponse.json({ error: 'El pedido mínimo debe ser un número positivo' }, { status: 400 })
    }

    if (data.delivery_time_minutes !== undefined && (isNaN(Number(data.delivery_time_minutes)) || Number(data.delivery_time_minutes) < 1)) {
      return NextResponse.json({ error: 'El tiempo de entrega debe ser al menos 1 minuto' }, { status: 400 })
    }

    const supabase = await createServiceClient()
    const { data: updated, error } = await supabase
      .from('restaurant_settings')
      .update({
        delivery_enabled: data.delivery_enabled,
        delivery_fee: Number(data.delivery_fee) || 0,
        delivery_min_order: Number(data.delivery_min_order) || 0,
        delivery_time_minutes: Number(data.delivery_time_minutes) || 30,
        cash_payment_enabled: data.cash_payment_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating delivery settings:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated, message: 'Configuración de delivery actualizada' })
  } catch (error) {
    console.error('Delivery API error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate')
      .eq('tenant_id', tenantId)
      .single()

    if (error) return NextResponse.json({ error: 'Error al obtener la configuración' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
