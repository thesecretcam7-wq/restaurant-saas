import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '@/lib/error-handler'

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

    // SECURITY: Rate limiting check (using IP + domain)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
    // TODO: Implement distributed rate limiting with Redis

    // Create service client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get tenant by slug or id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single()

    if (tenantError || !tenant) {
      logSecurityEvent('staff_auth_tenant_not_found', {
        domain,
        role,
        ip: clientIP,
      }, 'low')
      return NextResponse.json(
        { error: 'Datos incorrecto' },
        { status: 401 }
      )
    }

    // Roles match directly between API and database now
    const dbRole = role

    // Find staff member by PIN and role
    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id, name, role, is_active')
      .eq('tenant_id', tenant.id)
      .eq('pin', pin)
      .eq('role', dbRole)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      // SECURITY: Log failed auth attempt
      logSecurityEvent('staff_auth_failed', {
        domain,
        role,
        ip: clientIP,
        reason: staffError ? 'staff_not_found' : 'inactive',
      }, 'medium')

      return NextResponse.json(
        { error: 'PIN inválido' },
        { status: 401 }
      )
    }

    // SECURITY: Log successful auth
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
