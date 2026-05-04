import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, ...restaurantData } = body

    if (!tenantId) {
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

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('restaurant_settings')
      .update({
        display_name: restaurantData.display_name,
        description: restaurantData.description || null,
        address: restaurantData.address || null,
        phone: restaurantData.phone,
        email: restaurantData.email,
        city: restaurantData.city || null,
        country: restaurantData.country || 'ES',
        timezone: restaurantData.timezone,
        delivery_enabled: restaurantData.delivery_enabled || false,
        reservations_enabled: restaurantData.reservations_enabled || false,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
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
      .update({ country: restaurantData.country || 'ES' })
      .eq('id', tenantId)

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
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching restaurant settings:', error)
      return NextResponse.json(
        { error: 'Error al obtener la configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Restaurant GET API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
