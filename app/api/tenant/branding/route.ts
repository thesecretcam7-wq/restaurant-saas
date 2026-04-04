import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, ...brandingData } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Validaciones
    if (!brandingData.app_name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del restaurante es obligatorio' },
        { status: 400 }
      )
    }

    // Validar colores
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    const colors = ['primary_color', 'secondary_color', 'accent_color', 'background_color']
    for (const color of colors) {
      if (brandingData[color] && !colorRegex.test(brandingData[color])) {
        return NextResponse.json(
          { error: `${color} debe ser un color hexadecimal válido` },
          { status: 400 }
        )
      }
    }

    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('tenant_branding')
      .update({
        app_name: brandingData.app_name,
        tagline: brandingData.tagline || null,
        primary_color: brandingData.primary_color,
        secondary_color: brandingData.secondary_color,
        accent_color: brandingData.accent_color,
        background_color: brandingData.background_color,
        font_family: brandingData.font_family,
        logo_url: brandingData.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      console.error('Error updating branding:', error)
      return NextResponse.json(
        { error: 'Error al guardar los cambios' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Branding actualizado exitosamente',
    })
  } catch (error) {
    console.error('Branding API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantIdParam = searchParams.get('tenantId')
    const domainParam = searchParams.get('domain')

    let tenantId = tenantIdParam

    // If domain is provided, resolve it to tenantId
    if (!tenantId && domainParam) {
      const supabase = await createServiceClient()
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', domainParam)
        .single()

      if (tenantData) {
        tenantId = tenantData.id
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID or domain is required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceClient()

    // Fetch branding and tenant data together
    const [{ data: brandingData, error: brandingError }, { data: tenantData }] = await Promise.all([
      supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single(),
      supabase
        .from('tenants')
        .select('stripe_account_id, stripe_account_status, status, subscription_plan')
        .eq('id', tenantId)
        .single(),
    ])

    if (brandingError) {
      console.error('Error fetching branding:', brandingError)
      return NextResponse.json(
        { error: 'Error al obtener la configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...brandingData,
      stripe_account_id: tenantData?.stripe_account_id,
      stripe_account_status: tenantData?.stripe_account_status,
      subscription_status: tenantData?.status,
      subscription_plan: tenantData?.subscription_plan,
    })
  } catch (error) {
    console.error('Branding GET API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
