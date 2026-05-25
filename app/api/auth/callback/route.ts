import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { isOwnerEmail } from '@/lib/owner-auth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth_no_code`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[OAuth Callback] exchangeCodeForSession error:', error?.message)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const user = data.user
  const email = user.email || ''

  if (isOwnerEmail(email)) {
    return NextResponse.redirect(`${origin}/owner-dashboard`)
  }

  const serviceClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id, slug, status')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) {
    const registerUrl = new URL(`${origin}/register`)
    if (email) registerUrl.searchParams.set('email', email)
    registerUrl.searchParams.set('from_oauth', 'true')
    return NextResponse.redirect(registerUrl.toString())
  }

  if (tenant.status === 'suspended') {
    return NextResponse.redirect(`${origin}/login?error=suspended`)
  }

  const sessionToken = randomUUID()
  await serviceClient.from('active_sessions').upsert(
    { user_key: `owner:${user.id}`, tenant_id: tenant.id, session_token: sessionToken },
    { onConflict: 'user_key' }
  )

  const response = NextResponse.redirect(`${origin}/${tenant.slug}/acceso`)
  response.cookies.set('admin_session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400 * 30,
    path: '/',
  })
  return response
}
