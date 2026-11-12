import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/database'
import { randomUUID } from 'crypto'
import { verifyStaffAuthProof } from '@/lib/staff-auth-proof'
import { signServerValue } from '@/lib/server-signed-token'
import { getVerifiedStaffSession } from '@/lib/staff-session'
import { tenantAuthErrorResponse } from '@/lib/tenant-auth-error'

export async function GET() {
  const cookieStore = await cookies()
  let session
  try {
    session = await getVerifiedStaffSession(cookieStore, { upgrade: true })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }

  if (!session?.tenantId || !session?.staffId || !session?.role) {
    return NextResponse.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
  }

  return NextResponse.json({
    authenticated: true,
    tenantId: session.tenantId,
    staffId: session.staffId,
    staffName: session.staffName,
    role: session.role,
    permissions: session.permissions || [],
    createdAt: session.createdAt,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, role, staffId, staffName } = body

    if (!tenantId || !role || !staffId) {
      return NextResponse.json(
        { error: 'Missing session data' },
        { status: 400 }
      )
    }
    const cookieStore = await cookies()
    const proof = verifyStaffAuthProof(cookieStore.get('staff_auth_proof')?.value)
    if (!proof || proof.tenantId !== tenantId || proof.staffId !== staffId || proof.role !== role) {
      return NextResponse.json(
        { error: 'Session proof invalid or expired' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id, name, role, is_active')
      .eq('id', staffId)
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .eq('is_active', true)
      .maybeSingle()

    if (staffError) return NextResponse.json({ error: 'El sistema no responde. Intenta de nuevo en unos segundos.' }, { status: 503 })
    if (!staff) {
      return NextResponse.json({ error: 'Staff session not allowed' }, { status: 403 })
    }

    // Fetch permissions for the role
    let permissions: string[] = []
    if (role) {
      const { data: rolePerms, error: permissionsError } = await supabase
        .from('staff_role_permissions')
        .select('admin_permissions(key)')
        .eq('role', role)

      if (permissionsError) return NextResponse.json({ error: 'No se pudieron comprobar los permisos. Intenta de nuevo.' }, { status: 503 })

      if (rolePerms) {
        permissions = rolePerms
          .map((rp: any) => rp.admin_permissions?.key)
          .filter((key: string | undefined): key is string => !!key)
      }
    }

    // Single-session enforcement: only for admin sessions (not KDS/comandero)
    const sessionToken = randomUUID()
    const isAdminSession = permissions.some(p => p.startsWith('admin_'))
    if (staffId && isAdminSession) {
      const { error: sessionError } = await supabase.from('active_sessions').upsert({
        user_key: `staff:${staffId}`,
        tenant_id: tenantId,
        session_token: sessionToken,
      }, { onConflict: 'user_key' })
      if (sessionError) return NextResponse.json({ error: 'No se pudo confirmar la sesion. Intenta de nuevo.' }, { status: 503 })
    }

    const sessionData = {
      tenantId,
      staffId,
      staffName: staff.name || staffName,
      role: staff.role,
      permissions,
      sessionToken,
      createdAt: new Date().toISOString(),
    }

    const maxAge = staff.role === 'admin' ? 28800 : 604800

    const sessionJson = JSON.stringify(sessionData)
    const sessionSignature = signServerValue('staff-session-v1', sessionJson)
    cookieStore.set('staff_session', sessionJson, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge,
      path: '/',
    })
    cookieStore.set('staff_session_signature', sessionSignature, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge, path: '/' })
    cookieStore.delete('staff_auth_proof')

    return NextResponse.json({ success: true, permissions })
  } catch (error) {
    console.error('Session endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('staff_session')
  cookieStore.delete('staff_auth_proof')
  cookieStore.delete('staff_session_signature')

  return NextResponse.json({ success: true })
}
