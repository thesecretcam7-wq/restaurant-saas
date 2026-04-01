import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get hostname
  const hostname = request.headers.get('host')?.split(':')[0] || ''

  // Skip tenant detection for admin dashboard and API routes without domain
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('vercel.app') ||
    request.nextUrl.pathname.startsWith('/api/auth/register') ||
    request.nextUrl.pathname.startsWith('/api/auth/login') ||
    request.nextUrl.pathname.startsWith('/api/stripe')
  ) {
    return response
  }

  try {
    // Try to find tenant by domain
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('primary_domain', hostname)
      .single()

    if (tenant) {
      // Store tenant ID in request headers for use in the app
      response.headers.set('x-tenant-id', tenant.id)
    }
  } catch (error) {
    console.error('Error fetching tenant in middleware:', error)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
