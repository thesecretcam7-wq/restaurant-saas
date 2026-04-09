import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Configuración - Dominio base de la plataforma
// Ejemplos:
// - Vercel: restaurant-saas-inky.vercel.app
// - Local: localhost:3000
// - Custom: miplatforma.com
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'restaurant-saas-inky.vercel.app'
const SLUG_PATH_REGEX = /^\/([a-zA-Z0-9-]+)(?:\/|$)/

console.log(`[Middleware] BASE_DOMAIN configured: ${BASE_DOMAIN}`)

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const pathname = url.pathname

  console.log(`[Middleware] Request: ${hostname}${pathname}`)

  // CASO 1: Acceso por dominio personalizado (ej: mirestaurante.com)
  if (!hostname.includes(BASE_DOMAIN)) {
    console.log(`[Middleware] Case 1: Custom domain detected: ${hostname}`)
    // Buscar tenant por dominio personalizado
    const tenant = await getTenantByDomain(hostname)

    if (tenant) {
      console.log(`[Middleware] Case 1: Rewriting to /${tenant.id}${pathname}`)
      // Reescribir a /{tenant-id}{pathname}
      url.pathname = `/${tenant.id}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 2: Acceso por slug en path (ej: miplatforma.com/mirestaurante-slug)
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  if (slugMatch) {
    const slug = slugMatch[1]
    console.log(`[Middleware] Case 2: Slug found: "${slug}"`)

    // Si ya tiene formato UUID, dejarlo como está
    if (isUUID(slug)) {
      console.log(`[Middleware] Case 2: Slug is UUID, passing through`)
      return NextResponse.next()
    }

    // Buscar tenant por slug
    const tenant = await getTenantBySlug(slug)

    if (tenant) {
      const restPath = pathname.slice(slug.length + 1) || '/'
      console.log(`[Middleware] Case 2: Rewriting to /${tenant.id}${restPath}`)
      // Reescribir a /{tenant-id}{resto-del-path}
      url.pathname = `/${tenant.id}${restPath}`
      return NextResponse.rewrite(url)
    } else {
      console.log(`[Middleware] Case 2: Tenant not found for slug "${slug}"`)
    }
  }

  // CASO 3: Acceso por subdominio (ej: mirestaurante.miplatforma.com)
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    console.log(`[Middleware] Case 3: Subdomain detected: ${subdomain}`)
    // Buscar tenant por slug (el subdominio actúa como slug)
    const tenant = await getTenantBySlug(subdomain)

    if (tenant) {
      console.log(`[Middleware] Case 3: Rewriting to /${tenant.id}${pathname}`)
      // Reescribir a /{tenant-id}{pathname}
      url.pathname = `/${tenant.id}${pathname}`
      return NextResponse.rewrite(url)
    } else {
      console.log(`[Middleware] Case 3: Tenant not found for subdomain "${subdomain}"`)
    }
  }

  console.log(`[Middleware] No cases matched, passing through`)
  return NextResponse.next()
}

async function getTenantByDomain(domain: string) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      }
    )

    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('primary_domain', domain)
      .single()

    if (error) {
      console.error(`[Middleware] Error fetching tenant with domain "${domain}":`, error.message)
      return null
    }

    console.log(`[Middleware] Found tenant with domain "${domain}":`, data)
    return data
  } catch (error) {
    console.error(`[Middleware] Exception fetching tenant by domain "${domain}":`, error)
    return null
  }
}

async function getTenantBySlug(slug: string) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      }
    )

    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error(`[Middleware] Error fetching tenant with slug "${slug}":`, error.message)
      return null
    }

    console.log(`[Middleware] Found tenant with slug "${slug}":`, data)
    return data
  } catch (error) {
    console.error(`[Middleware] Exception fetching tenant by slug "${slug}":`, error)
    return null
  }
}

function extractSubdomain(hostname: string, baseDomain: string): string | null {
  if (!hostname.includes(baseDomain)) {
    return null
  }

  const subdomain = hostname.replace(`.${baseDomain}`, '').replace(baseDomain, '')

  if (subdomain === hostname) {
    return null // No hay subdominio
  }

  return subdomain || null
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Configurar qué rutas usan middleware
export const config = {
  matcher: [
    // Todas las rutas excepto APIs y archivos estáticos
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
