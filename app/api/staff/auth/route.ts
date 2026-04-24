import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '@/lib/error-handler'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MINUTES = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, pin, role } = body

    if (!domain || !pin || !role) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
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

    // ── Rate limiting: max 10 failed attempts per IP per domain in 5 min ──
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('pin_auth_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', clientIP)
      .eq('domain', domain)
      .gte('attempted_at', windowStart)

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      logSecurityEvent('staff_auth_rate_limited', { domain, ip: clientIP }, 'high')
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 5 minutos.' },
        { status: 429 }
      )
    }

    // ── Cleanup old entries for this IP (keep DB lean) ──
    supabase
      .from('pin_auth_rate_limits')
      .delete()
      .eq('ip', clientIP)
      .lt('attempted_at', windowStart)
      .then(() => {})

    // ── Resolve tenant ──
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single()

    if (tenantError || !tenant) {
      logSecurityEvent('staff_auth_tenant_not_found', { domain, role, ip: clientIP }, 'low')
      return NextResponse.json({ error: 'Datos incorrecto' }, { status: 401 })
    }

    // ── Validate PIN ──
    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id, name, role, is_active')
      .eq('tenant_id', tenant.id)
      .eq('pin', pin)
      .eq('role', role)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      // Record failed attempt for rate limiting
      await supabase
        .from('pin_auth_rate_limits')
        .insert({ ip: clientIP, domain })

      logSecurityEvent('staff_auth_failed', {
        domain,
        role,
        ip: clientIP,
        reason: staffError ? 'staff_not_found' : 'inactive',
      }, 'medium')

      return NextResponse.json({ error: 'PIN inválido' }, { status: 401 })
    }

    logSecurityEvent('staff_auth_success', {
      domain,
      staffId: staff.id,
      role: staff.role,
      ip: clientIP,
    }, 'low')

    return NextResponse.json({
      success: true,
      staff_id: staff.id,
      staff_name: staff.name,
      role: staff.role,
    })
  } catch (error) {
    const isDev = process.env.NODE_ENV === 'development'
    logSecurityEvent('staff_auth_exception', {
      error: error instanceof Error ? error.message : 'unknown',
    }, 'high')

    return NextResponse.json(
      { error: isDev ? (error instanceof Error ? error.message : 'Error') : 'Error interno' },
      { status: 500 }
    )
  }
}
