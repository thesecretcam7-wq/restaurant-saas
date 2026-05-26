import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'
import { getLockedTenantBrandingColors } from '@/lib/brand-colors'

async function sendWelcomeEmail({
  email,
  ownerName,
  restaurantName,
  slug,
}: {
  email: string
  ownerName: string
  restaurantName: string
  slug: string
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eccofoodapp.com'
  const dashboardUrl = `${appUrl}/${slug}/admin/dashboard`
  const staffUrl = `${appUrl}/${slug}/acceso`
  const displayName = ownerName || 'Bienvenido'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Eccofood</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e63946 0%,#c1121f 100%);padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">🍽️ Eccofood</p>
              <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.85);">Tu restaurante ya está listo</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">¡Hola, ${displayName}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                Tu restaurante <strong style="color:#111827;">${restaurantName}</strong> ha sido creado con éxito en Eccofood.
                Para que puedas empezar a explorar la plataforma de inmediato, hemos creado un equipo de personal de prueba con los siguientes accesos:
              </p>

              <!-- Staff table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:28px;">
                <tr style="background-color:#f9fafb;">
                  <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Nombre</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">Rol</th>
                  <th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb;">PIN de acceso</th>
                </tr>
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:500;">Admin</td>
                  <td style="padding:14px 16px;font-size:14px;color:#6b7280;">Administrador</td>
                  <td style="padding:14px 16px;"><span style="background:#fef3c7;color:#92400e;font-family:monospace;font-size:14px;font-weight:700;padding:3px 10px;border-radius:6px;">000000</span></td>
                </tr>
                <tr style="border-bottom:1px solid #f3f4f6;background:#fafafa;">
                  <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:500;">Caja</td>
                  <td style="padding:14px 16px;font-size:14px;color:#6b7280;">Cajero / TPV</td>
                  <td style="padding:14px 16px;"><span style="background:#fef3c7;color:#92400e;font-family:monospace;font-size:14px;font-weight:700;padding:3px 10px;border-radius:6px;">999999</span></td>
                </tr>
                <tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:500;">Mesero</td>
                  <td style="padding:14px 16px;font-size:14px;color:#6b7280;">Camarero</td>
                  <td style="padding:14px 16px;"><span style="background:#fef3c7;color:#92400e;font-family:monospace;font-size:14px;font-weight:700;padding:3px 10px;border-radius:6px;">123456</span></td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:500;">Cocina</td>
                  <td style="padding:14px 16px;font-size:14px;color:#6b7280;">Cocinero / KDS</td>
                  <td style="padding:14px 16px;"><span style="background:#fef3c7;color:#92400e;font-family:monospace;font-size:14px;font-weight:700;padding:3px 10px;border-radius:6px;">567890</span></td>
                </tr>
              </table>

              <!-- Security warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#9a3412;">⚠️ Importante — Cambia los PINs antes de abrir</p>
                    <p style="margin:0;font-size:13px;color:#c2410c;line-height:1.6;">
                      Estos son PINs genéricos que conoce cualquier persona con acceso a este correo.
                      <strong>Cámbialos antes de que tu personal empiece a usarlos</strong> para evitar accesos no autorizados.
                      Puedes hacerlo en <strong>Panel Admin → Personal → editar cada empleado</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="padding-right:8px;" width="50%">
                    <a href="${dashboardUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#e63946,#c1121f);color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;">
                      Ir al Panel Admin
                    </a>
                  </td>
                  <td style="padding-left:8px;" width="50%">
                    <a href="${staffUrl}" style="display:block;text-align:center;background:#f3f4f6;color:#374151;text-decoration:none;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;">
                      Acceso del Personal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Este correo fue enviado a ${email}</p>
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">¿Necesitas ayuda? <a href="${appUrl}/soporte" style="color:#e63946;text-decoration:none;font-weight:600;">Contactar soporte</a></p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Eccofood · Todos los derechos reservados</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Eccofood <no-reply@eccofoodapp.com>',
        to: [email],
        subject: `¡Bienvenido a Eccofood, ${restaurantName}! 🍽️`,
        html,
      }),
    })
  } catch (err) {
    console.error('⚠️ [Register] Welcome email failed (non-blocking):', err)
  }
}

async function insertTenantBranding(
  supabase: any,
  payload: Record<string, any>
) {
  let safePayload = { ...payload }

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from('tenant_branding').insert(safePayload)
    if (!error) return null

    const missingColumn = error.message.match(/'([^']+)' column of 'tenant_branding'/)?.[1]
    if (!missingColumn || !(missingColumn in safePayload)) return error

    delete safePayload[missingColumn]
  }

  return new Error('No se pudo crear branding despues de quitar columnas no disponibles')
}

function buildBaseSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

async function createUniqueSlug(supabase: any, baseSlug: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('slug')
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}%`)

  if (error) throw error

  const existing = new Set((data || []).map((row: { slug: string }) => row.slug))
  if (!existing.has(baseSlug)) return baseSlug

  for (let index = 2; index < 1000; index++) {
    const candidate = `${baseSlug}${index}`
    if (!existing.has(candidate)) return candidate
  }

  return `${baseSlug}${Date.now().toString().slice(-6)}`
}

async function findAuthUserByEmail(supabase: any, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const user = data?.users?.find((authUser: { email?: string }) =>
      authUser.email?.toLowerCase() === email
    )

    if (user) return user
    if (!data?.users || data.users.length < 1000) return null
  }

  return null
}

async function createAuthUserWithOrphanRecovery(
  supabase: any,
  email: string,
  password: string
) {
  let result = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!result.error) return result

  const message = result.error.message || ''
  const emailAlreadyExists =
    message.toLowerCase().includes('already') ||
    message.toLowerCase().includes('registered') ||
    message.toLowerCase().includes('exists')

  if (!emailAlreadyExists) return result

  const { count, error: tenantCountError } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('owner_email', email)

  if (tenantCountError || (count || 0) > 0) return result

  const orphanUser = await findAuthUserByEmail(supabase, email)
  if (!orphanUser?.id) return result

  const { error: deleteError } = await supabase.auth.admin.deleteUser(orphanUser.id)
  if (deleteError) return result

  result = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  return result
}

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
      country,
      timezone,
    } = body
    const normalizedEmail = String(email || '').trim().toLowerCase()

    const headerCountry =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      ''
    const restaurantCountry = String(country || headerCountry || 'ES').toUpperCase()
    const restaurantTimezone = timezone || (restaurantCountry === 'ES' ? 'Europe/Madrid' : 'America/Bogota')


    if (!normalizedEmail || !password || !restaurantName) {
      console.error('❌ [Register] Missing required fields')
      return NextResponse.json(
        { error: 'Campos requeridos: email, contraseña, nombre del restaurante' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const missingEnv = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean)

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Faltan variables de Supabase en .env.local: ${missingEnv.join(', ')}` },
        { status: 500 }
      )
    }

    const url = supabaseUrl as string
    const serviceKey = supabaseServiceKey as string
    const anonKey = supabaseAnonKey as string

    // Use plain supabase-js client with service role key to bypass RLS
    const supabase = createClient(
      url,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create auth user
    const { data: authData, error: authError } = await createAuthUserWithOrphanRecovery(
      supabase,
      normalizedEmail,
      password
    )

    if (authError) {
      console.error('❌ [Register] Auth error:', authError.message)
      return NextResponse.json(
        { error: `Error de autenticación: ${authError.message}` },
        { status: 400 }
      )
    }


    // Create tenant
    const baseSlug = buildBaseSlug(restaurantName)


    // Validate slug is not empty
    if (!baseSlug || baseSlug.length === 0) {
      console.error('❌ [Register] Slug is empty')
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'El nombre del restaurante debe contener al menos un carácter válido (letras o números)' },
        { status: 400 }
      )
    }

    const slug = await createUniqueSlug(supabase, baseSlug)
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        organization_name: restaurantName,
        slug,
        owner_id: authData.user.id,
        owner_email: normalizedEmail,
        owner_name: ownerName || '',
        country: restaurantCountry,
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


    const lockedBrandingColors = getLockedTenantBrandingColors()

    // Create default branding
    const brandingError = await insertTenantBranding(supabase, {
      tenant_id: tenantData.id,
      ...lockedBrandingColors,
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
        country: restaurantCountry,
        timezone: restaurantTimezone,
        online_payment_provider: restaurantCountry === 'CO' ? 'wompi' : 'stripe',
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

    const defaultStaffMembers = [
      { name: 'Admin', role: 'admin', pin: '000000' },
      { name: 'Caja', role: 'cajero', pin: '999999' },
      { name: 'Mesero', role: 'camarero', pin: '123456' },
      { name: 'Cocina', role: 'cocinero', pin: '567890' },
    ]

    const { error: staffError } = await supabase
      .from('staff_members')
      .insert(defaultStaffMembers.map(staff => ({
        tenant_id: tenantData.id,
        name: staff.name,
        role: staff.role,
        pin: staff.pin,
        is_active: true,
      })))

    if (staffError) {
      console.error('Default staff creation failed:', staffError.message)
    }

    // Send welcome email (non-blocking — never fails the registration)
    sendWelcomeEmail({
      email: normalizedEmail,
      ownerName: ownerName || '',
      restaurantName,
      slug,
    }).catch(() => {})

    // Now create authenticated session with SSR client
    const cookieStore = await cookies()
    const authClient = createServerClient(
      url,
      anonKey,
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
      email: normalizedEmail,
      password,
    })

    if (sessionError) {
      console.error('⚠️ [Register] Session creation failed (but user was created):', sessionError.message)
      // Don't fail here - user exists, just no session in response
      // Frontend will need to login
    }
    // Check if this is the software owner (system admin)
    const ownerEmails = ['thesecretcam7@gmail.com']
    const isOwner = ownerEmails.includes(normalizedEmail)
    const redirectUrl = isOwner ? '/owner-dashboard' : `/${tenantData.slug}/bienvenida?nuevo=1`

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
