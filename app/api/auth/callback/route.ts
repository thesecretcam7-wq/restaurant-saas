import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAuthLimiter, applyRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code) {
      return NextResponse.json(
        { error: 'Código de autenticación no proporcionado' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
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

    // Exchange code for session (Supabase OAuth flow)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data?.user) {
      console.error('OAuth exchange error:', error)
      return NextResponse.redirect(
        new URL('/login?error=oauth_failed', request.url)
      )
    }

    const user = data.user

    // Rate limiting by user ID
    const authLimiter = getAuthLimiter()
    if (authLimiter) {
      const { limited, headers } = await applyRateLimit(
        authLimiter,
        `login:oauth:${user.id}`
      )
      if (limited) {
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta más tarde.' },
          { status: 429, headers }
        )
      }
    }

    // Get tenant for this user
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, primary_domain, status')
      .eq('owner_id', user.id)
      .single()

    // If no tenant exists, redirect to registration
    if (tenantError || !tenant) {
      // User authenticated via OAuth but doesn't have a tenant yet
      // Redirect to registration with pre-filled email
      const registerUrl = new URL('/register', request.url)
      registerUrl.searchParams.set('email', user.email || '')
      registerUrl.searchParams.set('from_oauth', 'true')
      return NextResponse.redirect(registerUrl)
    }

    if (tenant.status === 'suspended') {
      return NextResponse.redirect(
        new URL('/login?error=suspended', request.url)
      )
    }

    // Create session token for single-session enforcement
    const sessionToken = randomUUID()
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    await serviceClient.from('active_sessions').upsert(
      {
        user_key: `owner:${user.id}`,
        tenant_id: tenant.id,
        session_token: sessionToken,
      },
      { onConflict: 'user_key' }
    )

    // Determine redirect URL
    const ownerEmails = ['thesecretcam7@gmail.com']
    const isOwner = ownerEmails.includes(user.email || '')
    const redirectUrl = isOwner ? '/owner-dashboard' : `/${tenant.slug}/acceso`

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))

    // Set session cookie (same as login route)
    response.cookies.set('admin_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 30,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=server_error', request.url)
    )
  }
}
