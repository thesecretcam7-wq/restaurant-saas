import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/planes',
  '/unauthorized',
  '/manifest.webmanifest',
  '/sw.js',
])

type TenantRoute = { id: string; slug: string }
type StaffSession = {
  tenantId?: string
  staffId?: string
  role?: string
  permissions?: string[]
  sessionToken?: string
}
const tenantCache = new Map<string, { value: TenantRoute | null; expiresAt: number }>()
const TENANT_CACHE_TTL = 60_000

// Rate limiters — inicializados lazy para evitar errores si faltan env vars
let globalLimiter: Ratelimit | null = null
let authLimiter: Ratelimit | null = null

function getGlobalLimiter() {
  if (!globalLimiter && process.env.UPSTASH_REDIS_REST_URL) {
    const redis = Redis.fromEnv()
    globalLimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(500, '1 m'), prefix: 'eccofood:global' })
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

function getStaffSession(request: NextRequest): StaffSession | null {
  const raw = request.cookies.get('staff_session')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as StaffSession
  } catch {
    return null
  }
}

function staffCanAccessTenant(staffSession: StaffSession | null, tenantId: string) {
  return Boolean(staffSession?.tenantId && staffSession.tenantId === tenantId)
}

function staffHasAnyRole(staffSession: StaffSession | null, roles: string[]) {
  if (!staffSession?.role) return false
  const permissions = staffSession.permissions || []
  return roles.includes(staffSession.role) || permissions.some((p) => p.startsWith('admin_'))
}

function getOperationalAccess(pathname: string) {
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  const slug = slugMatch?.[1] || ''
  const restPath = slug ? pathname.slice(slug.length + 1) || '/' : pathname

  if (restPath === '/admin/kds' || restPath.startsWith('/admin/kds/')) {
    return { slug, roles: ['cocinero'], loginRole: 'cocinero', allowOwnerSession: false }
  }
  if (
    restPath === '/admin/pos' ||
    (restPath.startsWith('/admin/pos/') && !restPath.startsWith('/admin/pos/display'))
  ) {
    return { slug, roles: ['cajero'], loginRole: 'cajero', allowOwnerSession: false }
  }
  if (restPath === '/kitchen' || restPath.startsWith('/kitchen/')) {
    return { slug, roles: ['camarero'], loginRole: 'camarero', allowOwnerSession: false }
  }
  if (restPath === '/staff/pos' || restPath.startsWith('/staff/pos/')) {
    return { slug, roles: ['cajero'], loginRole: 'cajero', allowOwnerSession: false }
  }
  if (restPath === '/staff/kds' || restPath.startsWith('/staff/kds/')) {
    return { slug, roles: ['cocinero'], loginRole: 'cocinero', allowOwnerSession: false }
  }
  if (restPath === '/cocina' || restPath.startsWith('/cocina/')) {
    return { slug, roles: ['cocinero'], loginRole: 'cocinero', allowOwnerSession: false }
  }
  if (restPath === '/kiosko' || restPath.startsWith('/kiosko/')) {
    return { slug, roles: ['cajero', 'admin', 'camarero', 'cocinero'], loginRole: 'cajero', allowOwnerSession: false }
  }
  if (restPath === '/pantalla' || restPath.startsWith('/pantalla/')) {
    return { slug, roles: ['cajero', 'admin', 'camarero', 'cocinero'], loginRole: 'cajero', allowOwnerSession: false }
  }
  if (restPath === '/pos-display' || restPath.startsWith('/pos-display/')) {
    return { slug, roles: ['cajero', 'admin', 'camarero', 'cocinero'], loginRole: 'cajero', allowOwnerSession: false }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname
  const isAssetPath =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/screenshots/') ||
    pathname.match(/\.(?:ico|png|jpg|jpeg|svg|webp|avif|css|js|map|txt)$/)

  // En subdominios de restaurantes, la raiz debe abrir la tienda:
  // elbuenpaladar.eccofoodapp.com -> /elbuenpaladar
  const earlySubdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (!isAssetPath && earlySubdomain && earlySubdomain !== 'www' && earlySubdomain !== 'app' && pathname === '/') {
    const tenant = await getTenantBySlug(earlySubdomain)
    if (tenant) {
      url.pathname = `/${tenant.slug}`
      return NextResponse.rewrite(url)
    }
  }

  if (
    PUBLIC_PATHS.has(pathname) ||
    isAssetPath
  ) {
    return NextResponse.next()
  }

  // ─── RATE LIMITING ────────────────────────────────────────────────────────
  const isStripeWebhook = pathname === '/api/stripe/webhook'
  // RSC prefetch (_rsc param) y sw.js son peticiones internas del browser/Next.js
  const isRscPrefetch = url.searchParams.has('_rsc')
  const isServiceWorker = pathname === '/sw.js'

  if (!isStripeWebhook && !isRscPrefetch && !isServiceWorker) {
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
  const operationalAccess = getOperationalAccess(pathname)
  if (operationalAccess?.slug) {
    const tenant = isUUID(operationalAccess.slug)
      ? await getTenantById(operationalAccess.slug)
      : await getTenantBySlug(operationalAccess.slug)

    if (!tenant) {
      return NextResponse.redirect(new URL(`/${operationalAccess.slug}/acceso`, request.url))
    }

    const staffSession = getStaffSession(request)
    if (
      staffCanAccessTenant(staffSession, tenant.id) &&
      staffHasAnyRole(staffSession, operationalAccess.roles)
    ) {
      return NextResponse.next()
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (operationalAccess.allowOwnerSession && supabaseUrl && supabaseAnonKey) {
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
          const superAdminEmails = ['thesecretcam7@gmail.com']
          if (superAdminEmails.includes(user.email || '')) return response

          const serviceSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          const { data: ownedTenant } = await serviceSupabase
            .from('tenants')
            .select('id')
            .eq('id', tenant.id)
            .eq('owner_id', user.id)
            .maybeSingle()

          if (ownedTenant) return response
        }
      } catch {
        // Continue to PIN redirect.
      }
    }

    const loginUrl = new URL(`/${tenant.slug}/acceso/login/${operationalAccess.loginRole}`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  const isAdminLogin = pathname.includes('/admin/login')
  const isPublicAdminPage = pathname.includes('/admin/pos/display')
  const requiresAuth = pathname.includes('/admin/') && !isAdminLogin && !isPublicAdminPage

  if (requiresAuth) {
    const slugMatch = pathname.match(SLUG_PATH_REGEX)
    const slug = slugMatch?.[1] || ''
    const routeTenant = slug ? (isUUID(slug) ? await getTenantById(slug) : await getTenantBySlug(slug)) : null

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // VÍA 1: staff_session cookie (staff con PIN)
    const staffSession = getStaffSession(request)
    if (staffSession) {
      try {
        const permissions: string[] = staffSession.permissions || []
        const hasAdminAccess = permissions.some(p => p.startsWith('admin_'))
        if (hasAdminAccess && routeTenant && staffCanAccessTenant(staffSession, routeTenant.id)) {
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
        // If this browser also has an owner/admin Supabase session, let the
        // owner path below validate it instead of blocking because a staff
        // PIN cookie from TPV/KDS is present.
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

          if (!routeTenant) {
            const loginUrl = new URL(`/${slug}/admin/login`, request.url)
            return NextResponse.redirect(loginUrl)
          }

          const { data: ownedTenant } = await serviceSupabase
            .from('tenants')
            .select('id')
            .eq('id', routeTenant.id)
            .eq('owner_id', user.id)
            .maybeSingle()

          if (ownedTenant) return response
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

  // CASO 2: Subdominio del restaurante: elbuenpaladar.eccofoodapp.com
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    const tenant = await getTenantBySlug(subdomain)
    if (tenant) {
      const slugPrefix = `/${tenant.slug}`
      if (pathname === slugPrefix || pathname.startsWith(`${slugPrefix}/`)) {
        const cleanPath = pathname.slice(slugPrefix.length) || '/'
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = cleanPath
        return NextResponse.redirect(redirectUrl)
      }

      url.pathname = `/${tenant.slug}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 3: Slug en path
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

  return NextResponse.next()
}

async function getTenantByDomain(domain: string) {
  return getCachedTenant(`domain:${domain}`, async () => {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('primary_domain', domain).single()
    return data
  } catch { return null }
  })
}

async function getTenantBySlug(slug: string) {
  return getCachedTenant(`slug:${slug}`, async () => {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('slug', slug).single()
    return data
  } catch { return null }
  })
}

async function getTenantById(id: string) {
  return getCachedTenant(`id:${id}`, async () => {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data } = await supabase.from('tenants').select('id, slug').eq('id', id).single()
    return data
  } catch { return null }
  })
}

async function getCachedTenant(key: string, fetcher: () => Promise<TenantRoute | null>) {
  const cached = tenantCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const value = await fetcher()
  tenantCache.set(key, { value, expiresAt: Date.now() + TENANT_CACHE_TTL })
  return value
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
