import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/
const OWNER_EMAILS = ['thesecretcam7@gmail.com', 'johang.musica@gmail.com']
const RATE_LIMIT_TIMEOUT_MS = 750
const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/auth/callback',
  '/auth/update-password',
  '/forgot-password',
  '/register',
  '/planes',
  '/owner-login',
  '/eccofood-admin',
  '/tpv-emergencia',
  '/soporte',
  '/unauthorized',
  '/manifest.webmanifest',
  '/sw.js',
])
const TENANT_PWA_IDENTITY_PATHS = new Set([
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
])

type TenantRoute = { id: string; slug?: string | null }
type StaffSession = {
  tenantId?: string
  staffId?: string
  role?: string
  permissions?: string[]
  sessionToken?: string
}
const tenantCache = new Map<string, { value: TenantRoute | null; expiresAt: number }>()
const TENANT_CACHE_TTL = 60_000
const TENANT_LOOKUP_TIMEOUT_MS = 1200
const TENANT_SEGMENT_REGEX = /^[a-zA-Z0-9-]{2,64}$/
const EARLY_NEXT_PATH_PREFIXES = ['/api/', '/_next/', '/favicon']
const PROBE_PATH_REGEX = /\.(?:php|txt|xml|json|asp|aspx|cgi|env|git|bak|old|sql|zip|tar|gz)$/i

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

async function limitOrSkip(limiter: Ratelimit, identifier: string) {
  return Promise.race([
    limiter.limit(identifier),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RATE_LIMIT_TIMEOUT_MS)),
  ]).catch((error) => {
    console.warn('[proxy rate-limit] skipped after error:', error instanceof Error ? error.message : error)
    return null
  })
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
    const value = raw.trim().startsWith('{') ? raw : decodeURIComponent(raw)
    return JSON.parse(value) as StaffSession
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

function withStoreHeaders(request: NextRequest, slug: string) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-eccofood-route-kind', 'store')
  requestHeaders.set('x-eccofood-tenant-slug', slug)
  return requestHeaders
}

function getTenantRouteSegment(tenant: TenantRoute, fallback?: string) {
  return tenant.slug || fallback || tenant.id
}

function isPotentialTenantSegment(segment: string) {
  return isUUID(segment) || TENANT_SEGMENT_REGEX.test(segment)
}

function isVercelPreviewHost(hostname: string) {
  const cleanHostname = hostname.split(':')[0]?.toLowerCase() || hostname.toLowerCase()
  return cleanHostname.endsWith('.vercel.app')
}

function getWaiterRootRedirect(request: NextRequest, tenant: TenantRoute, targetPathname: string) {
  const staffSession = getStaffSession(request)
  if (staffCanAccessTenant(staffSession, tenant.id) && staffSession?.role === 'camarero') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = targetPathname
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }
  return null
}

function isTenantPwaIdentityPath(pathname: string) {
  return TENANT_PWA_IDENTITY_PATHS.has(pathname)
}

function isOwnerProtectedPath(pathname: string) {
  return (
    pathname === '/owner-dashboard' ||
    pathname === '/gestionar-cuentas' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  )
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
  return null
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname
  const isAssetPath =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/screenshots/') ||
    pathname.match(/\.(?:ico|png|jpg|jpeg|svg|webp|avif|css|js|map|txt)$/)

  if (EARLY_NEXT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (PROBE_PATH_REGEX.test(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // En subdominios de restaurantes, la raiz debe abrir la tienda:
  // elbuenpaladar.eccofoodapp.com -> /elbuenpaladar
  const earlySubdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (!isAssetPath && earlySubdomain && earlySubdomain !== 'www' && earlySubdomain !== 'app' && pathname === '/') {
    const tenant = await getTenantBySlug(earlySubdomain)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant, earlySubdomain)
      const waiterRedirect = getWaiterRootRedirect(request, tenant, '/kitchen')
      if (waiterRedirect) return waiterRedirect
      url.pathname = `/${tenantSegment}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  // En dominios personalizados, la raiz debe abrir la tienda del tenant antes
  // de tratar "/" como pagina publica de la plataforma.
  if (!isAssetPath && !hostname.includes(BASE_DOMAIN) && !isVercelPreviewHost(hostname) && pathname === '/') {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant)
      const waiterRedirect = getWaiterRootRedirect(request, tenant, '/kitchen')
      if (waiterRedirect) return waiterRedirect
      url.pathname = `/${tenantSegment}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  if (!hostname.includes(BASE_DOMAIN) && !isVercelPreviewHost(hostname) && isTenantPwaIdentityPath(pathname)) {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant)
      url.pathname = `/${tenantSegment}${pathname}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  if (earlySubdomain && earlySubdomain !== 'www' && earlySubdomain !== 'app' && isTenantPwaIdentityPath(pathname)) {
    const tenant = await getTenantBySlug(earlySubdomain)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant, earlySubdomain)
      url.pathname = `/${tenantSegment}${pathname}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  if (!isAssetPath && isOwnerProtectedPath(pathname)) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/owner-login', request.url))
    }

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
    if (!user?.email || !OWNER_EMAILS.includes(user.email)) {
      return NextResponse.redirect(new URL('/owner-login', request.url))
    }

    return response
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
        const result = await limitOrSkip(limiter, ip)
        if (result && !result.success) {
          return NextResponse.json(
            { error: 'Demasiados intentos. Espera un momento antes de continuar.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString() } }
          )
        }
      }
    } else {
      const limiter = getGlobalLimiter()
      if (limiter) {
        const result = await limitOrSkip(limiter, ip)
        if (result && !result.success) {
          return NextResponse.json(
            { error: 'Demasiadas solicitudes. Intenta más tarde.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString() } }
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

    const loginUrl = new URL(`/${getTenantRouteSegment(tenant, operationalAccess.slug)}/acceso/login/${operationalAccess.loginRole}`, request.url)
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
  if (!hostname.includes(BASE_DOMAIN) && !isVercelPreviewHost(hostname)) {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant)
      const slugPrefix = `/${tenantSegment}`
      if (pathname === slugPrefix || pathname.startsWith(`${slugPrefix}/`)) {
        const cleanPath = pathname.slice(slugPrefix.length) || '/'
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = cleanPath
        return NextResponse.redirect(redirectUrl)
      }

      url.pathname = `/${tenantSegment}${pathname}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  // CASO 2: Subdominio del restaurante: elbuenpaladar.eccofoodapp.com
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    const tenant = await getTenantBySlug(subdomain)
    if (tenant) {
      const tenantSegment = getTenantRouteSegment(tenant, subdomain)
      const slugPrefix = `/${tenantSegment}`
      if (pathname === slugPrefix || pathname.startsWith(`${slugPrefix}/`)) {
        const cleanPath = pathname.slice(slugPrefix.length) || '/'
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = cleanPath
        return NextResponse.redirect(redirectUrl)
      }

      url.pathname = `/${tenantSegment}${pathname}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  // CASO 3: Slug en path
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  if (slugMatch) {
    const slug = slugMatch[1]
    if (!isPotentialTenantSegment(slug)) {
      return NextResponse.next()
    }
    const tenant = isUUID(slug) ? await getTenantById(slug) : await getTenantBySlug(slug)
    if (tenant) {
      const restPath = pathname.slice(slug.length + 1) || '/'
      const tenantSegment = getTenantRouteSegment(tenant, slug)
      if (restPath === '/') {
        const waiterRedirect = getWaiterRootRedirect(request, tenant, `/${tenantSegment}/kitchen`)
        if (waiterRedirect) return waiterRedirect
      }
      url.pathname = `/${tenantSegment}${restPath}`
      return NextResponse.rewrite(url, { request: { headers: withStoreHeaders(request, tenantSegment) } })
    }
  }

  return NextResponse.next()
}

async function getTenantByDomain(domain: string) {
  const cleanDomain = domain.split(':')[0]?.toLowerCase() || domain.toLowerCase()
  return getCachedTenant(`domain:${cleanDomain}`, async (signal) => {
  try {
    const candidates = cleanDomain.startsWith('www.')
      ? [cleanDomain, cleanDomain.slice(4)]
      : [cleanDomain, `www.${cleanDomain}`]
    return await fetchTenantRow(`select=id,slug&primary_domain=in.(${candidates.join(',')})&limit=1`, signal)
  } catch { return null }
  })
}

async function getTenantBySlug(slug: string) {
  if (!isPotentialTenantSegment(slug) || isUUID(slug)) return null
  return getCachedTenant(`slug:${slug}`, async (signal) => {
  try {
    return await fetchTenantRow(`select=id,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`, signal)
  } catch { return null }
  })
}

async function getTenantById(id: string) {
  return getCachedTenant(`id:${id}`, async (signal) => {
  try {
    return await fetchTenantRow(`select=id,slug&id=eq.${encodeURIComponent(id)}&limit=1`, signal)
  } catch { return null }
  })
}

async function fetchTenantRow(query: string, signal: AbortSignal): Promise<TenantRoute | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const response = await fetch(`${supabaseUrl}/rest/v1/tenants?${query}`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
    signal,
  })
  if (!response.ok) return null

  const rows = await response.json() as TenantRoute[]
  return rows[0] || null
}

async function getCachedTenant(key: string, fetcher: (signal: AbortSignal) => Promise<TenantRoute | null>) {
  const cached = tenantCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TENANT_LOOKUP_TIMEOUT_MS)
  const value = await fetcher(controller.signal).catch((error) => {
    console.warn('[proxy tenant lookup] skipped after error:', error instanceof Error ? error.message : error)
    return null
  }).finally(() => {
    clearTimeout(timeout)
  })

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
