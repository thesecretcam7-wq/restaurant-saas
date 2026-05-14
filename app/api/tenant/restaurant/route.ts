import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_COUNTRIES = new Set(['ES', 'CO', 'MX', 'US', 'AR', 'PE', 'CL'])

async function resolveTenant(supabase: ReturnType<typeof createServiceClient>, slugOrId: string) {
  const query = supabase
    .from('tenants')
    .select('id, slug, organization_name, country')

  const { data, error } = UUID_REGEX.test(slugOrId)
    ? await query.eq('id', slugOrId).maybeSingle()
    : await query.eq('slug', slugOrId).maybeSingle()

  if (error) throw error
  return data
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId: slugOrId, ...restaurantData } = body

    if (!slugOrId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Validaciones
    if (!restaurantData.display_name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del restaurante es obligatorio' },
        { status: 400 }
      )
    }

    if (!restaurantData.phone?.trim()) {
      return NextResponse.json(
        { error: 'El teléfono es obligatorio' },
        { status: 400 }
      )
    }

    if (!restaurantData.email?.trim()) {
      return NextResponse.json(
        { error: 'El email es obligatorio' },
        { status: 400 }
      )
    }

    // Validar email formato básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(restaurantData.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validar timezone
    const validTimezones = [
      'Europe/Madrid',
      'America/New_York',
      'America/Los_Angeles',
      'America/Mexico_City',
      'America/Bogota',
      'America/Buenos_Aires',
    ]

    if (!validTimezones.includes(restaurantData.timezone)) {
      return NextResponse.json(
        { error: 'Zona horaria inválida' },
        { status: 400 }
      )
    }

    const country = String(restaurantData.country || 'ES').toUpperCase()
    if (!VALID_COUNTRIES.has(country)) {
      return NextResponse.json(
        { error: 'Pais invalido' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const tenant = await resolveTenant(supabase, slugOrId)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado' },
        { status: 404 }
      )
    }

    const { data: existingSettings } = await supabase
      .from('restaurant_settings')
      .select('delivery_enabled, reservations_enabled')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const { data, error } = await supabase
      .from('restaurant_settings')
      .upsert({
        tenant_id: tenant.id,
        display_name: restaurantData.display_name,
        description: restaurantData.description || null,
        address: restaurantData.address || null,
        phone: restaurantData.phone,
        email: restaurantData.email,
        city: restaurantData.city || null,
        country,
        timezone: restaurantData.timezone,
        cash_payment_enabled: restaurantData.cash_payment_enabled ?? true,
        tax_rate: Number(restaurantData.tax_rate) || 0,
        delivery_enabled: restaurantData.delivery_enabled ?? existingSettings?.delivery_enabled ?? false,
        reservations_enabled: restaurantData.reservations_enabled ?? existingSettings?.reservations_enabled ?? false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating restaurant settings:', error)
      return NextResponse.json(
        { error: 'Error al guardar los cambios' },
        { status: 500 }
      )
    }

    await supabase
      .from('tenants')
      .update({ country })
      .eq('id', tenant.id)

    return NextResponse.json({
      success: true,
      data,
      message: 'Información del restaurante actualizada exitosamente',
    })
  } catch (error) {
    console.error('Restaurant API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const slugOrId = searchParams.get('tenantId')

    if (!slugOrId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const tenant = await resolveTenant(supabase, slugOrId)
    if (!tenant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching restaurant settings:', error)
      return NextResponse.json(
        { error: 'Error al obtener la configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        display_name: data?.display_name || tenant.organization_name || '',
        description: data?.description || '',
        address: data?.address || '',
        phone: data?.phone || '',
        email: data?.email || '',
        city: data?.city || '',
        cash_payment_enabled: data?.cash_payment_enabled ?? true,
        tax_rate: data?.tax_rate ?? 0,
        ...data,
        tenant_id: tenant.id,
        country: data?.country || tenant.country || 'ES',
        timezone: data?.timezone || 'Europe/Madrid',
      },
    })
  } catch (error) {
    console.error('Restaurant GET API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
