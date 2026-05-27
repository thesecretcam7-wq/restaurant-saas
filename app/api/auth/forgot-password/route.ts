import { NextResponse } from 'next/server'
import { getAuthLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin')
  if (origin) return origin

  const url = new URL(request.url)
  return url.origin
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un email valido' }, { status: 400 })
    }

    const authLimiter = getAuthLimiter()
    if (authLimiter) {
      const ip = getClientIp(request)
      const { limited, headers } = await applyRateLimit(authLimiter, `forgot-password:${email}:${ip}`)
      if (limited) {
        return NextResponse.json(
          { error: 'Demasiados intentos. Espera un minuto antes de continuar.' },
          { status: 429, headers }
        )
      }
    }

    const supabase = await createClient()
    const redirectTo = new URL('/auth/callback', getBaseUrl(request))
    redirectTo.searchParams.set('mode', 'recovery')
    redirectTo.searchParams.set('next', '/auth/update-password')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo.toString(),
    })

    if (error) {
      console.error('[Forgot password] Supabase error:', error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, enviaremos un enlace para cambiar la contrasena.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
