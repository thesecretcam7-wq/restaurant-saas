import { requireTenantAccess } from './tenant-api-auth'

export { STAFF_SESSION_SIGNATURE } from './staff-session'

export async function requirePOSCartAccess(tenantId: string) {
  await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'], requireAdminPermission: true })
}
