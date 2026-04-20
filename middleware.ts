import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofood.vercel.app'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // Solo rutas /admin/* requieren autenticación, excepto /admin/login
  const isAdminLogin = pathname.includes('/admin/login')
  const requiresAuth = pathname.includes('/admin/') && !isAdminLogin

  // ─── PROTECCIÓN DE RUTAS (TODO excepto tienda y acceso) ───────────────────
  if (requiresAuth) {
    const slugMatch = pathname.match(SLUG_PATH_REGEX)
    const slug = slugMatch?.[1] || ''

    // VÍA 1: staff_session cookie (staff con PIN)
    const staffSessionCookie = request.cookies.get('staff_session')?.value
    if (staffSessionCookie) {
      try {
        const staffSession = JSON.parse(staffSessionCookie)
        const permissions: string[] = staffSession.permissions || []
        const hasAdminAccess = permissions.some(p => p.startsWith('admin_'))
        if (hasAdminAccess) return NextResponse.next()
        // Tiene sesión de staff pero sin permisos admin
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      } catch {
        // Cookie corrupta, continuar a verificar Supabase
      }
    }

    // VÍA 2: Supabase session (dueño del restaurante con email/password)
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
        if (user) return response // Usuario Supabase autenticado → permitir paso
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
