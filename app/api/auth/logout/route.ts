import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase/database'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getVerifiedStaffSession } from '@/lib/staff-session'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.auth.signOut()

  // Clear active session from DB
  if (user) {
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await serviceClient.from('active_sessions').delete().eq('user_key', `owner:${user.id}`)
  }

  try {
    const session = await getVerifiedStaffSession(cookieStore)
    if (session) {
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      await serviceClient.from('active_sessions').delete().eq('user_key', `staff:${session.staffId}`)
        .eq('tenant_id', session.tenantId).eq('session_token', session.sessionToken)
        .retry(false).abortSignal(AbortSignal.timeout(8000))
    }
  } catch { /* An unverifiable cookie must never revoke another employee's session. */ }

  const requestUrl = new URL(request.url)
  if (requestUrl.hostname === '0.0.0.0') {
    requestUrl.hostname = 'localhost'
  }
  const nextPath = requestUrl.searchParams.get('next')
  const redirectPath = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/login'
  const response = NextResponse.redirect(new URL(redirectPath, requestUrl), { status: 303 })
  response.cookies.delete('admin_session_token')
  response.cookies.delete('staff_session')
  response.cookies.delete('staff_session_signature')
  return response
}
