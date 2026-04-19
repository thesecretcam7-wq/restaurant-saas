import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofood.vercel.app'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  // ─── PROTECCIÓN DE RUTAS ADMIN ───────────────────────────────────────────
  // Cualquier ruta que contenga /admin pero no sea la página de login
  const isAdminRoute = pathname.includes('/admin') || pathname.includes('/dashboard') || pathname.includes('/productos') || pathname.includes('/pedidos') || pathname.includes('/reservas') || pathname.includes('/clientes') || pathname.includes('/ventas') || pathname.includes('/configuracion') || pathname.includes('/tpv') || pathname.includes('/kds') || pathname.includes('/comandero')
  const isLoginRoute = pathname.includes('/acceso')

  if (isAdminRoute && !isLoginRoute) {
    // Verificar sesión de Supabase via cookie
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    let response = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

    if (!user) {
      // Sin sesión: detectar el slug del tenant y redirigir a su login
      const slugMatch = pathname.match(SLUG_PATH_REGEX)
      const slug = slugMatch?.[1] || ''
      const loginUrl = new URL(`/${slug}/acceso`, request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Con sesión: verificar permisos de staff si aplica
    const staffSessionCookie = request.cookies.get('staff_session')?.value
    if (staffSessionCookie) {
      try {
        const staffSession = JSON.parse(staffSessionCookie)
        const permissions = staffSession.permissions || []
        const hasAdminAccess = permissions.some((p: string) => p.startsWith('admin_'))
        if (!hasAdminAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      } catch {
        // Cookie inválida, continuar con la sesión de Supabase normal
      }
    }

    return response
  }

  // ─── ROUTING MULTI-TENANT ────────────────────────────────────────────────

  // CASO 1: Acceso por dominio personalizado (ej: mirestaurante.com)
  if (!hostname.includes(BASE_DOMAIN)) {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      url.pathname = `/${tenant.slug}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 2: Acceso por slug en path (ej: miplatforma.com/mirestaurante-slug)
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  if (slugMatch) {
    const slug = slugMatch[1]
    let tenant
    if (isUUID(slug)) {
      tenant = await getTenantById(slug)
    } else {
      tenant = await getTenantBySlug(slug)
    }

    if (tenant) {
      const restPath = pathname.slice(slug.length + 1) || '/'
      url.pathname = `/${tenant.slug}${restPath}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 3: Acceso por subdominio (ej: mirestaurante.miplatforma.com)
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase.from('tenants').select('id, slug').eq('primary_domain', domain).single()
    return data
  } catch {
    return null
  }
}

async function getTenantBySlug(slug: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase.from('tenants').select('id, slug').eq('slug', slug).single()
    return data
  } catch {
    return null
  }
}

async function getTenantById(id: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase.from('tenants').select('id, slug').eq('id', id).single()
    return data
  } catch {
    return null
  }
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
