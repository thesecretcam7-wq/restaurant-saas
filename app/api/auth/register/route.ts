import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Límite estricto en registro (3 por IP por minuto) — previene creación masiva de cuentas
    const authLimiter = getAuthLimiter()
    if (authLimiter) {
      const ip = getClientIp(request)
      const { limited, headers } = await applyRateLimit(authLimiter, `register:${ip}`)
      if (limited) {
        return NextResponse.json(
          { error: 'Demasiados intentos de registro. Espera un minuto.' },
          { status: 429, headers }
        )
      }
    }

    const body = await request.json()
    const {
      email,
      password,
      restaurantName,
      ownerName,
    } = body


    if (!email || !password || !restaurantName) {
      console.error('❌ [Register] Missing required fields')
      return NextResponse.json(
        { error: 'Campos requeridos: email, contraseña, nombre del restaurante' },
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
      console.error('❌ [Register] Auth error:', authError.message)
      return NextResponse.json(
        { error: `Error de autenticación: ${authError.message}` },
        { status: 400 }
      )
    }


    // Create tenant
    let slug = restaurantName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')


    // Validate slug is not empty
    if (!slug || slug.length === 0) {
      console.error('❌ [Register] Slug is empty')
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'El nombre del restaurante debe contener al menos un carácter válido (letras o números)' },
        { status: 400 }
      )
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        organization_name: restaurantName,
        slug,
        owner_id: authData.user.id,
        owner_email: email,
        owner_name: ownerName || '',
        status: 'trial',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('❌ [Register] Tenant error:', tenantError.message)
      // Clean up auth user if tenant creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error al crear tenant: ${tenantError.message}` },
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

    // Now create authenticated session with SSR client
    const cookieStore = await cookies()
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
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

    const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
      email,
      password,
    })

    if (sessionError) {
      console.error('⚠️ [Register] Session creation failed (but user was created):', sessionError.message)
      // Don't fail here - user exists, just no session in response
      // Frontend will need to login
    }

    // Create demo tenant automatically
    const demoSlug = `demo-${tenantData.id.substring(0, 8)}`

    const { data: demoTenantData, error: demoTenantError } = await supabase
      .from('tenants')
      .insert({
        organization_name: `Demo - ${restaurantName}`,
        slug: demoSlug,
        owner_id: authData.user.id,
        owner_email: email,
        owner_name: ownerName || '',
        status: 'trial',
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single()

    if (demoTenantError) {
      console.error('⚠️ [Register] Demo tenant creation failed:', demoTenantError.message)
    } else {

      // Create demo branding
      await supabase
        .from('tenant_branding')
        .insert({
          tenant_id: demoTenantData.id,
          primary_color: '#10b981',
          secondary_color: '#3b82f6',
          accent_color: '#f97316',
          background_color: '#ffffff',
          font_family: 'Inter',
          app_name: 'Demo - ' + restaurantName,
          tagline: 'Restaurante Demo',
        })

      // Create demo restaurant settings
      await supabase
        .from('restaurant_settings')
        .insert({
          tenant_id: demoTenantData.id,
          display_name: 'Restaurante Demo',
          country: 'CO',
          timezone: 'America/Bogota',
          waiter_pin: '1234',
          kitchen_pin: '5678',
        })

      // Create demo staff members
      const demoStaffRoles = [
        { name: 'Juan Camarero Demo', role: 'camarero', pin: '123456' },
        { name: 'Miguel Cocinero Demo', role: 'cocinero', pin: '567890' },
        { name: 'Carlos Cajero Demo', role: 'cajero', pin: '999999' },
        { name: 'Admin Demo', role: 'admin', pin: '000000' },
      ]

      for (const staff of demoStaffRoles) {
        await supabase.from('staff_members').insert({
          tenant_id: demoTenantData.id,
          name: staff.name,
          role: staff.role,
          pin: staff.pin,
          is_active: true,
        })
      }

    }

    // Check if this is the software owner (system admin)
    const ownerEmails = ['thesecretcam7@gmail.com']
    const isOwner = ownerEmails.includes(email)
    const redirectUrl = isOwner ? '/owner-dashboard' : `/${tenantData.slug}/acceso`

    return NextResponse.json({
      success: true,
      tenant: tenantData,
      redirectUrl,
      message: 'Registered successfully',
    })
  } catch (error) {
    console.error('❌ [Register] Exception:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Error interno: ${errorMsg}` },
      { status: 500 }
    )
  }
}
