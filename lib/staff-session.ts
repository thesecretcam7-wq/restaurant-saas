import { timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createServiceClient } from './supabase/server'
import { TenantAuthError } from './tenant-auth-error'
import { signServerValue, verifyServerValue } from './server-signed-token'

export const STAFF_SESSION_SIGNATURE = 'staff_session_signature'
export interface VerifiedStaffSession {
  tenantId: string
  staffId: string
  staffName: string
  role: string
  permissions: string[]
  sessionToken: string
  createdAt: string
}

type CookieReader = { get(name: string): { value: string } | undefined }
type Options = { tenantId?: string; upgrade?: boolean }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const pending = new Map<string, Promise<VerifiedStaffSession>>()
const sessionTTL = (role: string) => role === 'admin' ? 28800 : 604800

function read(reader: CookieReader) {
  const value = reader.get('staff_session')?.value
  if (!value) return null
  if (value.length > 16384) throw new TenantAuthError('Unauthorized', 401)
  let raw: string
  let data: any
  try {
    raw = value.trim().startsWith('{') ? value : decodeURIComponent(value)
    data = JSON.parse(raw)
  } catch {
    throw new TenantAuthError('Unauthorized', 401)
  }
  if (
    !data || !UUID.test(data.tenantId || '') || !UUID.test(data.staffId || '') || !UUID.test(data.sessionToken || '')
    || typeof data.role !== 'string' || !data.role || data.role.length > 64 || typeof data.createdAt !== 'string'
    || (data.permissions !== undefined && (
      !Array.isArray(data.permissions) || data.permissions.length > 128
      || data.permissions.some((p: unknown) => typeof p !== 'string' || p.length > 128)
    ))
  ) throw new TenantAuthError('Unauthorized', 401)

  const issued = Date.parse(data.createdAt)
  if (!Number.isFinite(issued) || issued > Date.now() + 60000 || Date.now() - issued >= sessionTTL(data.role) * 1000) {
    throw new TenantAuthError('Unauthorized', 401)
  }
  const session: VerifiedStaffSession = {
    tenantId: data.tenantId, staffId: data.staffId,
    staffName: typeof data.staffName === 'string' ? data.staffName : '',
    role: data.role, permissions: data.permissions || [],
    sessionToken: data.sessionToken, createdAt: data.createdAt,
  }
  return { raw, session }
}

// Public routing preferences never query the database or trust unsigned JSON.
export function getSignedStaffSession(reader: CookieReader): VerifiedStaffSession | null {
  const value = read(reader)
  if (!value) return null
  const signature = reader.get(STAFF_SESSION_SIGNATURE)?.value
  if (!signature) return null
  if (!verifyServerValue('staff-session-v1', value.raw, signature)) throw new TenantAuthError('Unauthorized', 401)
  return value.session
}

async function verifyLegacy(staff: VerifiedStaffSession): Promise<VerifiedStaffSession> {
  const db = createServiceClient()
  const signal = AbortSignal.timeout(8000)
  const [active, member] = await Promise.all([
    db.from('active_sessions').select('session_token')
      .eq('user_key', 'staff:' + staff.staffId).eq('tenant_id', staff.tenantId)
      .retry(false).abortSignal(signal).maybeSingle(),
    db.from('staff_members').select('id,name,role,is_active')
      .eq('id', staff.staffId).eq('tenant_id', staff.tenantId).eq('is_active', true)
      .retry(false).abortSignal(signal).maybeSingle(),
  ])
  if (active.error || member.error) throw new TenantAuthError('Unauthorized', 503)
  const expected = Buffer.from(active.data?.session_token || '')
  const actual = Buffer.from(staff.sessionToken)
  if (
    !expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)
    || !member.data || member.data.role !== staff.role
  ) throw new TenantAuthError('Unauthorized', 401)

  const result = await db.from('staff_role_permissions').select('admin_permissions(key)')
    .eq('role', member.data.role).retry(false).abortSignal(signal)
  if (result.error) throw new TenantAuthError('Unauthorized', 503)
  const permissions = (result.data || []).map((p: any) => p.admin_permissions?.key)
    .filter((p: unknown): p is string => typeof p === 'string')
  return { ...staff, staffId: member.data.id, staffName: member.data.name || '', role: member.data.role, permissions }
}

export async function getVerifiedStaffSession(reader?: CookieReader, options: Options = {}): Promise<VerifiedStaffSession | null> {
  const store = reader || await cookies()
  const value = read(store)
  if (!value) return null
  if (options.tenantId && value.session.tenantId !== options.tenantId) return null
  const signature = store.get(STAFF_SESSION_SIGNATURE)?.value
  if (signature) {
    if (!verifyServerValue('staff-session-v1', value.raw, signature)) throw new TenantAuthError('Unauthorized', 401)
    return value.session
  }

  // Share only an in-flight verification of exactly the same legacy credential.
  // Authorization results are never cached across later requests.
  const key = signServerValue('legacy-staff-check-v1', value.raw)
  let request = pending.get(key)
  if (!request) {
    request = verifyLegacy(value.session).catch(error => {
      if (error instanceof TenantAuthError) throw error
      throw new TenantAuthError('Unauthorized', 503)
    }).finally(() => { if (pending.get(key) === request) pending.delete(key) })
    if (pending.size < 256) pending.set(key, request)
  }
  const staff = await request
  if (options.upgrade) {
    const writer = store as CookieReader & { set?: (name: string, value: string, options: Record<string, unknown>) => unknown }
    if (writer.set) {
      const raw = JSON.stringify(staff)
      const maxAge = Math.max(1, Math.floor(sessionTTL(staff.role) - (Date.now() - Date.parse(staff.createdAt)) / 1000))
      const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge }
      writer.set('staff_session', raw, cookieOptions)
      writer.set(STAFF_SESSION_SIGNATURE, signServerValue('staff-session-v1', raw), cookieOptions)
    }
  }
  return staff
}
