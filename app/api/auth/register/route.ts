import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
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
    const slug = restaurantName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

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
    await supabase
      .from('tenant_branding')
      .insert({
        tenant_id: tenantData.id,
        primary_color: '#3B82F6',
        secondary_color: '#1F2937',
        accent_color: '#F59E0B',
        background_color: '#FFFFFF',
        font_family: 'Inter',
        app_name: restaurantName,
        tagline: 'Bienvenido',
      })

    // Create default restaurant settings
    await supabase
      .from('restaurant_settings')
      .insert({
        tenant_id: tenantData.id,
        display_name: restaurantName,
        country: 'CO',
        timezone: 'America/Bogota',
      })

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
