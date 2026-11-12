import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getVerifiedUser, isAuthConnectionError } from '@/lib/supabase/network'
import { getVerifiedStaffSession } from './staff-session'
import { TenantAuthError } from './tenant-auth-error'
export { TenantAuthError, tenantAuthErrorResponse } from './tenant-auth-error'

export interface TenantAccess {
  type: 'owner' | 'staff'
  userId?: string
  staffId?: string
  role?: string
  permissions?: string[]
}

const STAFF_ROLES = ['admin', 'cajero', 'camarero', 'cocinero']

export async function requireTenantAccess(
  tenantId: string,
  options: { staffRoles?: string[]; requireAdminPermission?: boolean } = {}
): Promise<TenantAccess> {
  const cookieStore = await cookies()
  let staffSession
  try {
    staffSession = await getVerifiedStaffSession(cookieStore, { tenantId, upgrade: true })
  } catch (error) {
    if (!(error instanceof TenantAuthError) || error.status >= 500) throw error
    // A stale/invalid PIN cookie must not block an independently verified owner.
    staffSession = null
  }
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
  let user
  try {
    user = await getVerifiedUser(supabase)
  } catch (error) {
    if (isAuthConnectionError(error)) throw new TenantAuthError('Unauthorized', 503)
    throw error
  }
  if (!user) throw new TenantAuthError('Unauthorized', 401)

  const serviceSupabase = createServiceClient()
  const { data: tenant, error: tenantError } = await serviceSupabase
    .from('tenants')
    .select('id, owner_id')
    .eq('id', tenantId)
    .retry(false)
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle()

  if (tenantError) throw new TenantAuthError('Forbidden', 503)

  if (!tenant || tenant.owner_id !== user.id) {
    throw new TenantAuthError('Forbidden', 403)
  }

  return { type: 'owner', userId: user.id }
}
