import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  const staffSession = cookieStore.get('staff_session')?.value
  if (staffSession) {
    try {
      const { staffId } = JSON.parse(staffSession)
      if (staffId) {
        const serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        await serviceClient.from('active_sessions').delete().eq('user_key', `staff:${staffId}`)
      }
    } catch {}
  }

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 })
  response.cookies.delete('admin_session_token')
  response.cookies.delete('staff_session')
  return response
}
