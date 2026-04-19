import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofood.vercel.app'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/

// Segmentos de ruta que requieren autenticación de staff
const PROTECTED_SEGMENTS = [
  '/admin',
  '/dashboard',
  '/productos',
  '/pedidos',
  '/reservas',
  '/clientes',
  '/ventas',
  '/configuracion',
  '/tpv',
  '/kds',
  '/comandero',
  '/staff',
]

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  const isLoginRoute = pathname.includes('/acceso')
  const isProtectedRoute = !isLoginRoute && PROTECTED_SEGMENTS.some(seg => pathname.includes(seg))

  // ─── PROTECCIÓN DE RUTAS ─────────────────────────────────────────────────
  if (isProtectedRoute) {
    const staffSessionCookie = request.cookies.get('staff_session')?.value

    if (!staffSessionCookie) {
      // Sin sesión: redirigir al login del tenant
      const slugMatch = pathname.match(SLUG_PATH_REGEX)
      const slug = slugMatch?.[1] || ''
      const loginUrl = new URL(`/${slug}/acceso`, request.url)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const staffSession = JSON.parse(staffSessionCookie)
      const permissions: string[] = staffSession.permissions || []

      // Rutas /admin requieren permiso admin_*
      if (pathname.includes('/admin') || pathname.includes('/dashboard') || pathname.includes('/configuracion')) {
        const hasAdminAccess = permissions.some(p => p.startsWith('admin_'))
        if (!hasAdminAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    } catch {
      // Cookie corrupta → redirigir al login
      const slugMatch = pathname.match(SLUG_PATH_REGEX)
      const slug = slugMatch?.[1] || ''
      const loginUrl = new URL(`/${slug}/acceso`, request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─── ROUTING MULTI-TENANT ────────────────────────────────────────────────

  // CASO 1: Dominio personalizado (ej: mirestaurante.com)
  if (!hostname.includes(BASE_DOMAIN)) {
    const tenant = await getTenantByDomain(hostname)
    if (tenant) {
      url.pathname = `/${tenant.slug}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 2: Slug en path (ej: eccofood.vercel.app/mirestaurante/menu)
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

  // CASO 3: Subdominio (ej: mirestaurante.eccofood.vercel.app)
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
  } catch { return null }
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
  } catch { return null }
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
