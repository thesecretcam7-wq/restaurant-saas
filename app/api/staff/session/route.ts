import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { verifyStaffAuthProof } from '@/lib/staff-auth-proof'

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
      .single()

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Staff session not allowed' }, { status: 403 })
    }

    // Fetch permissions for the role
    let permissions: string[] = []
    if (role) {
      const { data: rolePerms } = await supabase
        .from('staff_role_permissions')
        .select('admin_permissions(key)')
        .eq('role', role)

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
      await supabase.from('active_sessions').upsert({
        user_key: `staff:${staffId}`,
        tenant_id: tenantId,
        session_token: sessionToken,
      }, { onConflict: 'user_key' })
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

    cookieStore.set('staff_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 28800,
      path: '/',
    })
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
