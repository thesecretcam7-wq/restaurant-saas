import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logSecurityEvent } from '@/lib/error-handler'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MINUTES = 5

const ROLE_DESTINATIONS: Record<string, (tenantSlug: string) => string> = {
  admin: (tenantSlug) => `/${tenantSlug}/admin/dashboard`,
  cocinero: (tenantSlug) => `/${tenantSlug}/staff/kds`,
  camarero: (tenantSlug) => `/${tenantSlug}/kitchen`,
  cajero: (tenantSlug) => `/${tenantSlug}/staff/pos`,
}

function redirectBack(request: NextRequest, tenantSlug: string, role: string, staffId: string, error: string) {
  const safeSlug = tenantSlug || 'login'
  const safeRole = role || 'camarero'
  const backUrl = new URL(`/${safeSlug}/acceso/login/${safeRole}`, request.url)
  if (staffId) backUrl.searchParams.set('staffId', staffId)
  backUrl.searchParams.set('error', error)
  return NextResponse.redirect(backUrl, { status: 303 })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const tenantId = String(formData.get('tenantId') || '').trim()
    const tenantSlug = String(formData.get('tenantSlug') || '').trim()
    const role = String(formData.get('role') || '').trim()
    const staffId = String(formData.get('staffId') || '').trim()
    const staffName = String(formData.get('staffName') || '').trim()
    const pin = String(formData.get('pin') || '').replace(/\D/g, '').slice(0, 6)

    if (!tenantId || !tenantSlug || !role || !staffId || pin.length < 4) {
      return redirectBack(request, tenantSlug, role, staffId, 'missing')
    }

    const clientIP = (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    ).trim()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('pin_auth_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', clientIP)
      .eq('domain', tenantSlug)
      .gte('attempted_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      logSecurityEvent('staff_form_auth_rate_limited', { domain: tenantSlug, ip: clientIP }, 'high')
      return redirectBack(request, tenantSlug, role, staffId, 'pin')
    }

    supabase
      .from('pin_auth_rate_limits')
      .delete()
      .eq('ip', clientIP)
      .lt('attempted_at', windowStart)
      .then(() => {})

    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id, name, role, is_active')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .eq('pin', pin)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      await supabase
        .from('pin_auth_rate_limits')
        .insert({ ip: clientIP, domain: tenantSlug })

      logSecurityEvent('staff_form_auth_failed', {
        domain: tenantSlug,
        role,
        staffId,
        ip: clientIP,
      }, 'medium')

      return redirectBack(request, tenantSlug, role, staffId, 'pin')
    }

    let permissions: string[] = []
    const { data: rolePerms } = await supabase
      .from('staff_role_permissions')
      .select('admin_permissions(key)')
      .eq('role', role)

    if (rolePerms) {
      permissions = rolePerms
        .map((rp: any) => rp.admin_permissions?.key)
        .filter((key: string | undefined): key is string => !!key)
    }

    const sessionToken = randomUUID()
    const isAdminSession = permissions.some((permission) => permission.startsWith('admin_'))
    if (isAdminSession) {
      await supabase.from('active_sessions').upsert({
        user_key: `staff:${staff.id}`,
        tenant_id: tenantId,
        session_token: sessionToken,
      }, { onConflict: 'user_key' })
    }

    const response = NextResponse.redirect(
      new URL(ROLE_DESTINATIONS[role]?.(tenantSlug) || `/${tenantSlug}/acceso/portal/${role}`, request.url),
      { status: 303 }
    )

    response.cookies.set('staff_session', JSON.stringify({
      tenantId,
      staffId: staff.id,
      staffName: staff.name || staffName,
      role: staff.role,
      permissions,
      sessionToken,
      createdAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 28800,
      path: '/',
    })

    response.cookies.delete('staff_auth_proof')

    logSecurityEvent('staff_form_auth_success', {
      domain: tenantSlug,
      staffId: staff.id,
      role: staff.role,
      ip: clientIP,
    }, 'low')

    return response
  } catch (error) {
    logSecurityEvent('staff_form_auth_exception', {
      error: error instanceof Error ? error.message : 'unknown',
    }, 'high')

    return NextResponse.redirect(new URL('/login?error=session', request.url), { status: 303 })
  }
}
