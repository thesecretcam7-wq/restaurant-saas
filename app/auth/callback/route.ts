import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { isOwnerEmail } from '@/lib/owner-auth'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function safePath(value: string | null, fallback = '/login') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback

  try {
    const url = new URL(value, 'https://eccofood.local')
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

function redirectWithError(request: Request, path: string, message: string) {
  const url = new URL(path, request.url)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url)
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

function getOAuthErrorMessage(requestUrl: URL) {
  const code = requestUrl.searchParams.get('error_code')
  const description = requestUrl.searchParams.get('error_description') || ''

  if (code === 'unexpected_failure' && description.includes('Unable to exchange external code')) {
    return 'Google no pudo validar la credencial OAuth. Revisa que el Client Secret de Google en Supabase sea correcto y pertenezca al mismo Client ID.'
  }

  return description || 'No pudimos iniciar sesion con Google.'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const oauthError =
    requestUrl.searchParams.get('error_description') ||
    requestUrl.searchParams.get('error')
  const mode = requestUrl.searchParams.get('mode')
  const fallbackPath = safePath(
    requestUrl.searchParams.get('next'),
    mode === 'owner' ? '/owner-login' : '/login'
  )

  if (oauthError) {
    return redirectWithError(request, fallbackPath, getOAuthErrorMessage(requestUrl))
  }

  if (!code) {
    return redirectWithError(request, fallbackPath, 'Google no devolvio un codigo de acceso valido.')
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return redirectWithError(request, fallbackPath, 'No pudimos completar el inicio de sesion con Google.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    await supabase.auth.signOut()
    return redirectWithError(request, fallbackPath, 'No pudimos verificar tu cuenta de Google.')
  }

  if (mode === 'recovery') {
    return redirectTo(request, safePath(requestUrl.searchParams.get('next'), '/auth/update-password'))
  }

  const email = user.email.toLowerCase()

  if (mode === 'owner' && !isOwnerEmail(email)) {
    await supabase.auth.signOut()
    return redirectWithError(request, '/owner-login', 'Este acceso es solo para el dueno de Eccofood.')
  }

  if (isOwnerEmail(email)) {
    return redirectTo(request, '/owner-dashboard')
  }

  const serviceClient = createServiceClient()
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .select('id, slug, primary_domain, status')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (tenantError || !tenant) {
    await supabase.auth.signOut()
    return redirectWithError(request, fallbackPath, 'No se encontro un restaurante asociado a tu cuenta de Google.')
  }

  if (tenant.status === 'suspended') {
    await supabase.auth.signOut()
    return redirectWithError(request, fallbackPath, 'Esta cuenta esta suspendida.')
  }

  const sessionToken = randomUUID()
  const { error: sessionError } = await serviceClient.from('active_sessions').upsert({
    user_key: `owner:${user.id}`,
    tenant_id: tenant.id,
    session_token: sessionToken,
  }, { onConflict: 'user_key' })

  if (sessionError) {
    await supabase.auth.signOut()
    return redirectWithError(request, fallbackPath, 'No pudimos preparar tu sesion del restaurante.')
  }

  const response = redirectTo(request, `/${tenant.slug}/acceso`)
  response.cookies.set('admin_session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400 * 30,
    path: '/',
  })

  return response
}
