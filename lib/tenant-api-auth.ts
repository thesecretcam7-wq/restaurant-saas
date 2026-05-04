import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface TenantAccess {
  type: 'owner' | 'staff'
  userId?: string
  staffId?: string
  role?: string
  permissions?: string[]
}

const STAFF_ROLES = ['admin', 'cajero', 'camarero', 'cocinero']

export class TenantAuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function parseStaffSession(value?: string | null) {
  if (!value) return null
  try {
    const session = JSON.parse(value)
    if (!session?.tenantId || !session?.staffId || !session?.role) return null
    return session as {
      tenantId: string
      staffId: string
      role: string
      permissions?: string[]
    }
  } catch {
    return null
  }
}

export async function requireTenantAccess(
  tenantId: string,
  options: { staffRoles?: string[]; requireAdminPermission?: boolean } = {}
): Promise<TenantAccess> {
  const cookieStore = await cookies()
  const staffSession = parseStaffSession(cookieStore.get('staff_session')?.value)
  const allowedRoles = options.staffRoles || STAFF_ROLES

  if (staffSession?.tenantId === tenantId) {
    const hasRole = allowedRoles.includes(staffSession.role)
    const hasAdminPermission = (staffSession.permissions || []).some(p => p.startsWith('admin_'))
    if (hasRole || (options.requireAdminPermission && hasAdminPermission)) {
      return {
        type: 'staff',
        staffId: staffSession.staffId,
        role: staffSession.role,
        permissions: staffSession.permissions || [],
      }
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new TenantAuthError('Unauthorized', 401)

  const serviceSupabase = createServiceClient()
  const { data: tenant } = await serviceSupabase
    .from('tenants')
    .select('id, owner_id')
    .eq('id', tenantId)
    .single()

  if (!tenant || tenant.owner_id !== user.id) {
    throw new TenantAuthError('Forbidden', 403)
  }

  return { type: 'owner', userId: user.id }
}

export function tenantAuthErrorResponse(error: unknown) {
  if (error instanceof TenantAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
