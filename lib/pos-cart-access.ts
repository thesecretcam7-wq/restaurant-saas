import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { createClient, createServiceClient } from './supabase/server'
import { getVerifiedUser, isAuthConnectionError } from './supabase/network'
import { TenantAuthError } from './tenant-api-auth'
import { signServerValue, verifyServerValue } from './server-signed-token'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const STAFF_SESSION_SIGNATURE = 'staff_session_signature'

export async function requirePOSCartAccess(tenantId: string) {
  const store = await cookies()
  const raw = store.get('staff_session')?.value
  let staff: any
  try { staff = raw ? JSON.parse(raw.trim().startsWith('{') ? raw : decodeURIComponent(raw)) : null } catch { staff = null }
  if (staff?.tenantId === tenantId && raw) {
    const signature = store.get(STAFF_SESSION_SIGNATURE)?.value
    const issued = Date.parse(staff.createdAt || '')
    const maxAge = staff.role === 'admin' ? 28800 : 604800
    const validAge = Number.isFinite(issued) && issued <= Date.now() + 60_000 && Date.now() - issued < maxAge * 1000
    if (!UUID.test(staff.staffId || '') || !validAge) throw new TenantAuthError('Unauthorized', 401)
    if (signature) {
      if (!verifyServerValue('staff-session-v1', raw, signature)) throw new TenantAuthError('Unauthorized', 401)
      if (['admin', 'cajero'].includes(staff.role) || (Array.isArray(staff.permissions) && staff.permissions.some((p: unknown) => typeof p === 'string' && p.startsWith('admin_')))) return
      throw new TenantAuthError('Forbidden', 403)
    }
    // Upgrade an already-issued legacy cookie only with a matching random server
    // session token and an active staff record. Never trust the JSON role/permissions.
    if (!UUID.test(staff.sessionToken || '')) throw new TenantAuthError('Unauthorized', 401)
    const db = createServiceClient(), signal = AbortSignal.timeout(8000)
    const [active, member] = await Promise.all([
      db.from('active_sessions').select('session_token').eq('user_key', 'staff:' + staff.staffId).eq('tenant_id', tenantId).retry(false).abortSignal(signal).maybeSingle(),
      db.from('staff_members').select('id, name, role, is_active').eq('id', staff.staffId).eq('tenant_id', tenantId).eq('is_active', true).retry(false).abortSignal(signal).maybeSingle(),
    ])
    if (active.error || member.error) throw new TenantAuthError('Unauthorized', 503)
    const expected = Buffer.from(active.data?.session_token || ''), actual = Buffer.from(staff.sessionToken)
    if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual) || !member.data || member.data.role !== staff.role) throw new TenantAuthError('Unauthorized', 401)
    const permissionsResult = await db.from('staff_role_permissions').select('admin_permissions(key)').eq('role', member.data.role).retry(false).abortSignal(signal)
    if (permissionsResult.error) throw new TenantAuthError('Unauthorized', 503)
    const permissions = (permissionsResult.data || []).map((p: any) => p.admin_permissions?.key).filter((p: unknown): p is string => typeof p === 'string')
    if (!['admin', 'cajero'].includes(member.data.role) && !permissions.some((p: string) => p.startsWith('admin_'))) throw new TenantAuthError('Forbidden', 403)
    // Preserve permissions loaded from the server, never from unsigned legacy JSON.
    const canonical = JSON.stringify({ tenantId, staffId: member.data.id, staffName: member.data.name, role: member.data.role, permissions, sessionToken: staff.sessionToken, createdAt: staff.createdAt })
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: Math.max(1, Math.floor(maxAge - (Date.now() - issued) / 1000)) }
    store.set('staff_session', canonical, options)
    store.set(STAFF_SESSION_SIGNATURE, signServerValue('staff-session-v1', canonical), options)
    return
  }
  // Owner authorization uses verified Supabase Auth, never the legacy staff JSON.
  let user
  try { user = await getVerifiedUser(await createClient()) }
  catch (error) { if (isAuthConnectionError(error)) throw new TenantAuthError('Unauthorized', 503); throw error }
  if (!user) throw new TenantAuthError('Unauthorized', 401)
  const { data, error } = await createServiceClient().from('tenants').select('id').eq('id', tenantId).eq('owner_id', user.id).retry(false).abortSignal(AbortSignal.timeout(8000)).maybeSingle()
  if (error) throw new TenantAuthError('Forbidden', 503)
  if (!data) throw new TenantAuthError('Forbidden', 403)
}
