import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/database'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAuthLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'
import { isOwnerEmail } from '@/lib/owner-auth'
import { isAuthConnectionError, supabaseFetch } from '@/lib/supabase/network'

export const maxDuration = 30

const AUTH_TIMEOUT_MS = 15000
const DATA_TIMEOUT_MS = 7000

async function timeoutResult<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = body.password

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contrasena requeridos' }, { status: 400 })
    }

    const authLimiter = getAuthLimiter()
    if (authLimiter) {
      const ip = getClientIp(request)
      const { limited, headers } = await applyRateLimit(authLimiter, `login:${email}:${ip}`)
      if (limited) {
        return NextResponse.json(
          { error: 'Demasiados intentos de inicio de sesion. Espera un minuto.' },
          { status: 429, headers }
        )
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
    const anonKey = supabaseAnonKey as string
    const serviceKey = supabaseServiceKey as string

    const cookieStore = await cookies()
    const supabase = createServerClient(
      url,
      anonKey,
      {
        global: { fetch: supabaseFetch },
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

    const { data, error } = await timeoutResult(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      'Supabase auth'
    )

    if (error) {
      console.error('[Login] Supabase auth error:', error.message)
      if (isAuthConnectionError(error)) {
        return NextResponse.json({ error: 'El servicio de acceso está tardando en responder. Espera unos segundos e intenta de nuevo.' },
          { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } })
      }
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (isOwnerEmail(email)) {
      return NextResponse.json({ success: true, tenant: null, redirectUrl: '/owner-dashboard' })
    }

    const { data: tenant, error: tenantError } = await timeoutResult(
      supabase
        .from('tenants')
        .select('id, slug, primary_domain, status')
        .eq('owner_id', data.user.id)
        .retry(false)
        .abortSignal(AbortSignal.timeout(DATA_TIMEOUT_MS))
        .single(),
      DATA_TIMEOUT_MS,
      'Tenant lookup'
    )

    if (tenantError && tenantError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'No se pudo cargar tu restaurante. Intenta entrar de nuevo en unos segundos.' }, { status: 503 })
    }
    if (!tenant) {
      return NextResponse.json({ error: 'No se encontro un restaurante asociado' }, { status: 404 })
    }

    if (tenant.status === 'suspended') {
      return NextResponse.json({ error: 'Esta cuenta esta suspendida' }, { status: 403 })
    }

    const sessionToken = randomUUID()
    const serviceClient = createClient(
      url,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    let sessionTokenSaved = true
    try {
      const result = await timeoutResult(
        serviceClient.from('active_sessions').upsert({
          user_key: `owner:${data.user.id}`,
          tenant_id: tenant.id,
          session_token: sessionToken,
        }, { onConflict: 'user_key' }).retry(false).abortSignal(AbortSignal.timeout(DATA_TIMEOUT_MS)),
        DATA_TIMEOUT_MS,
        'Session upsert'
      )
      if (result.error) sessionTokenSaved = false
    } catch (sessionError) {
      sessionTokenSaved = false
      console.warn('[Login] Session upsert skipped:', sessionError instanceof Error ? sessionError.message : sessionError)
    }

    const redirectUrl = `/${tenant.slug}/acceso`

    const response = NextResponse.json({ success: true, tenant, redirectUrl })
    if (sessionTokenSaved) {
      response.cookies.set('admin_session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 86400 * 30,
        path: '/',
      })
    }
    return response
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Supabase esta tardando demasiado en responder. Intenta de nuevo en unos segundos.' },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
