import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofood.vercel.app'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/

// Rate limiters — inicializados lazy para evitar errores si faltan env vars
let globalLimiter: Ratelimit | null = null
let authLimiter: Ratelimit | null = null

function getGlobalLimiter() {
  if (!globalLimiter && process.env.UPSTASH_REDIS_REST_URL) {
    const redis = Redis.fromEnv()
    globalLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'eccofood:global' })
  }
  return globalLimiter
}

function getAuthLimiter() {
  if (!authLimiter && process.env.UPSTASH_REDIS_REST_URL) {
    const redis = Redis.fromEnv()
    authLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'eccofood:auth' })
  }
  return authLimiter
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  )
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // ─── RATE LIMITING ────────────────────────────────────────────────────────
  // Excluir webhooks de Stripe (vienen de IPs de Stripe, necesitan ser confiables)
  const isStripeWebhook = pathname === '/api/stripe/webhook'

  if (!isStripeWebhook) {
    const ip = getClientIp(request)
    const isAuthEndpoint = pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')

    if (isAuthEndpoint) {
      const limiter = getAuthLimiter()
      if (limiter) {
        const { success, reset } = await limiter.limit(ip)
        if (!success) {
          return NextResponse.json(
            { error: 'Demasiados intentos. Espera un momento antes de continuar.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() } }
          )
        }
      }
    } else {
      const limiter = getGlobalLimiter()
      if (limiter) {
        const { success, reset } = await limiter.limit(ip)
        if (!success) {
          return NextResponse.json(
            { error: 'Demasiadas solicitudes. Intenta más tarde.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() } }
          )
        }
      }
    }
  }

  // ─── RUTAS API — solo rate limiting, sin redirección de auth ─────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ─── PROTECCIÓN DE RUTAS (solo /admin/*, excepto login y POS display) ─────
  const isAdminLogin = pathname.includes('/admin/login')
  const isPublicAdminPage = pathname.includes('/admin/pos/display')
  const requiresAuth = pathname.includes('/admin/') && !isAdminLogin && !isPublicAdminPage

  if (requiresAuth) {
    const slugMatch = pathname.match(SLUG_PATH_REGEX)
    const slug = slugMatch?.[1] || ''

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // VÍA 1: staff_session cookie (staff con PIN)
    const staffSessionCookie = request.cookies.get('staff_session')?.value
    if (staffSessionCookie) {
      try {
        const staffSession = JSON.parse(staffSessionCookie)
        const permissions: string[] = staffSession.permissions || []
        const hasAdminAccess = permissions.some(p => p.startsWith('admin_'))
        if (hasAdminAccess) {
          // Validate single-session token
          if (staffSession.sessionToken && staffSession.staffId) {
            const { data: active } = await serviceSupabase
              .from('active_sessions')
              .select('session_token')
              .eq('user_key', `staff:${staffSession.staffId}`)
              .single()
            if (!active || active.session_token !== staffSession.sessionToken) {
              const loginUrl = new URL(`/${slug}/admin/login?reason=otra_sesion`, request.url)
              const res = NextResponse.redirect(loginUrl)
              res.cookies.delete('staff_session')
              return res
            }
          }
          return NextResponse.next()
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      } catch {
        // Cookie corrupta, continuar a verificar Supabase
      }
    }

    // VÍA 2: Supabase session (dueño del restaurante con email/password O super admin)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      try {
        let response = NextResponse.next({ request })
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              response = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        })
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Super admin bypass - allow access to any restaurant
          const superAdminEmails = ['thesecretcam7@gmail.com']
          if (superAdminEmails.includes(user.email || '')) {
            return response
          }

          // Regular owner — validate single-session token
          const adminToken = request.cookies.get('admin_session_token')?.value
          if (adminToken) {
            const { data: active } = await serviceSupabase
              .from('active_sessions')
              .select('session_token')
              .eq('user_key', `owner:${user.id}`)
              .single()
            if (!active || active.session_token !== adminToken) {
              const loginUrl = new URL(`/${slug}/admin/login?reason=otra_sesion`, request.url)
              const res = NextResponse.redirect(loginUrl)
              res.cookies.delete('admin_session_token')
              return res
            }
          }
          return response
        }
      } catch {
        // Error verificando Supabase, continuar al bloqueo
      }
    }

    // Sin sesión válida → redirigir al login del admin
    const loginUrl = new URL(`/${slug}/admin/login`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  // ─── ROUTING MULTI-TENANT ────────────────────────────────────────────────

  // CASO 1: Dominio personalizado
  if (!hostname.includes(BASE_DOMAIN)) {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      url.pathname = `/${tenant.slug}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 2: Slug en path
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  if (slugMatch) {
    const slug = slugMatch[1]
    const tenant = isUUID(slug) ? await getTenantById(slug) : await getTenantBySlug(slug)
    if (tenant) {
      const restPath = pathname.slice(slug.length + 1) || '/'
      url.pathname = `/${tenant.slug}${restPath}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 3: Subdominio
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    const tenant = await getTenantBySlug(subdomain)
    if (tenant) {
      url.pathname = `/${tenant.slug}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

async function getTenantByDomain(domain: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('primary_domain', domain).single()
    return data
  } catch { return null }
}

async function getTenantBySlug(slug: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('slug', slug).single()
    return data
  } catch { return null }
}

async function getTenantById(id: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('id', id).single()
    return data
  } catch { return null }
}

function extractSubdomain(hostname: string, baseDomain: string): string | null {
  if (!hostname.includes(baseDomain)) return null
  const subdomain = hostname.replace(`.${baseDomain}`, '').replace(baseDomain, '')
  return subdomain === hostname ? null : subdomain || null
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
