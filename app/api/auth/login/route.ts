import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Get tenant for this user
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, primary_domain, status')
      .eq('owner_id', data.user.id)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'No se encontró un restaurante asociado' }, { status: 404 })
    }

    if (tenant.status === 'suspended') {
      return NextResponse.json({ error: 'Esta cuenta está suspendida' }, { status: 403 })
    }

    // Single-session enforcement: register token in DB
    const sessionToken = randomUUID()
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await serviceClient.from('active_sessions').upsert({
      user_key: `owner:${data.user.id}`,
      tenant_id: tenant.id,
      session_token: sessionToken,
    }, { onConflict: 'user_key' })

    // Check if this is the software owner (system admin)
    const isOwner = email === 'thesecretcam7@gmail.com'
    const redirectUrl = isOwner ? '/owner-dashboard' : `/${tenant.slug}/acceso`

    const response = NextResponse.json({ success: true, tenant, redirectUrl })
    response.cookies.set('admin_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 30,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
