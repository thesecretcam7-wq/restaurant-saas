import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, role, staffId, staffName } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

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

    const cookieStore = await cookies()

    const sessionData = {
      tenantId,
      staffId,
      staffName,
      role,
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

    return NextResponse.json({ success: true, permissions })
  } catch (error) {
    console.error('Session endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
