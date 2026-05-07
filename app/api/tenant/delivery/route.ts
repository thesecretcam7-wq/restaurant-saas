import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

type SupabaseClient = ReturnType<typeof createServiceClient>

function toDecimal(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : NaN
}

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

    const deliveryFee = toDecimal(data.delivery_fee)
    const deliveryMinOrder = toDecimal(data.delivery_min_order)
    const deliveryTimeMinutes = toDecimal(data.delivery_time_minutes, 30)
    const taxRate = toDecimal(data.tax_rate)

    if (data.delivery_fee !== undefined && (isNaN(deliveryFee) || deliveryFee < 0)) {
      return NextResponse.json({ error: 'El costo de delivery debe ser un numero positivo' }, { status: 400 })
    }

    if (data.delivery_min_order !== undefined && (isNaN(deliveryMinOrder) || deliveryMinOrder < 0)) {
      return NextResponse.json({ error: 'El pedido minimo debe ser un numero positivo' }, { status: 400 })
    }

    if (data.delivery_time_minutes !== undefined && (isNaN(deliveryTimeMinutes) || deliveryTimeMinutes < 1)) {
      return NextResponse.json({ error: 'El tiempo de entrega debe ser al menos 1 minuto' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, slugOrId)
    if (!tenantId) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data: existingSettings } = await supabase
      .from('restaurant_settings')
      .select('display_name')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('organization_name')
      .eq('id', tenantId)
      .maybeSingle()

    const { data: updated, error } = await supabase
      .from('restaurant_settings')
      .upsert({
        tenant_id: tenantId,
        display_name: existingSettings?.display_name || tenant?.organization_name || 'Restaurante',
        delivery_enabled: data.delivery_enabled,
        delivery_fee: deliveryFee || 0,
        delivery_min_order: deliveryMinOrder || 0,
        delivery_time_minutes: deliveryTimeMinutes || 30,
        cash_payment_enabled: data.cash_payment_enabled,
        tax_rate: taxRate || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating delivery settings:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated, message: 'Configuracion de delivery actualizada' })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Delivery API error:', error)
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
      .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate')
      .eq('tenant_id', tenantId)
      .single()

    if (error) return NextResponse.json({ error: 'Error al obtener la configuracion' }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
