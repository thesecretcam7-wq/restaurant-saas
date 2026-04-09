import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      restaurantName,
      ownerName,
    } = body

    if (!email || !password || !restaurantName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use plain supabase-js client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create tenant
    let slug = restaurantName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Validate slug is not empty
    if (!slug || slug.length === 0) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'El nombre del restaurante debe contener al menos un carácter válido (letras o números)' },
        { status: 400 }
      )
    }

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        organization_name: restaurantName,
        slug,
        owner_id: authData.user.id,
        owner_email: email,
        owner_name: ownerName || '',
        status: 'trial',
      })
      .select()
      .single()

    if (tenantError) {
      // Clean up auth user if tenant creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: tenantError.message },
        { status: 400 }
      )
    }

    // Create default branding
    const { error: brandingError } = await supabase
      .from('tenant_branding')
      .insert({
        tenant_id: tenantData.id,
        primary_color: '#0A0A0A',
        secondary_color: '#1F2937',
        accent_color: '#F97316',
        background_color: '#0A0A0A',
        font_family: 'Inter',
        app_name: restaurantName,
        tagline: 'Bienvenido',
      })

    if (brandingError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('tenants').delete().eq('id', tenantData.id)
      return NextResponse.json(
        { error: 'Error al crear branding: ' + brandingError.message },
        { status: 400 }
      )
    }

    // Create default restaurant settings
    const { error: settingsError } = await supabase
      .from('restaurant_settings')
      .insert({
        tenant_id: tenantData.id,
        display_name: restaurantName,
        country: 'CO',
        timezone: 'America/Bogota',
      })

    if (settingsError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.from('tenants').delete().eq('id', tenantData.id)
      await supabase.from('tenant_branding').delete().eq('tenant_id', tenantData.id)
      return NextResponse.json(
        { error: 'Error al crear configuración: ' + settingsError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      tenant: tenantData,
      message: 'Registered successfully',
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
