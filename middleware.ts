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

  // CASO 1: Acceso por dominio personalizado (ej: mirestaurante.com)
  if (!hostname.includes(BASE_DOMAIN)) {
    // Buscar tenant por dominio personalizado
    const tenant = await getTenantByDomain(hostname)

    if (tenant) {
      // Reescribir a /{tenant-id}{pathname}
      url.pathname = `/${tenant.id}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 2: Acceso por slug en path (ej: miplatforma.com/mirestaurante-slug)
  const slugMatch = pathname.match(SLUG_PATH_REGEX)
  if (slugMatch) {
    const slug = slugMatch[1]

    // Si ya tiene formato UUID, dejarlo como está
    if (isUUID(slug)) {
      return NextResponse.next()
    }

    // Buscar tenant por slug
    const tenant = await getTenantBySlug(slug)

    if (tenant) {
      // Reescribir a /{tenant-id}{resto-del-path}
      const restPath = pathname.slice(slug.length + 1) || '/'
      url.pathname = `/${tenant.id}${restPath}`
      return NextResponse.rewrite(url)
    }
  }

  // CASO 3: Acceso por subdominio (ej: mirestaurante.miplatforma.com)
  const subdomain = extractSubdomain(hostname, BASE_DOMAIN)
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // Buscar tenant por slug (el subdominio actúa como slug)
    const tenant = await getTenantBySlug(subdomain)

    if (tenant) {
      // Reescribir a /{tenant-id}{pathname}
      url.pathname = `/${tenant.id}${pathname}`
      return NextResponse.rewrite(url)
    }
  }

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

    const { data } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('primary_domain', domain)
      .single()

    return data
  } catch (error) {
    console.error('Error fetching tenant by domain:', error)
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

    const { data } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('slug', slug)
      .single()

    return data
  } catch (error) {
    console.error('Error fetching tenant by slug:', error)
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
