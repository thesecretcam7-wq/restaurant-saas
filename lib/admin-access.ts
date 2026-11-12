import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient, createServiceClient } from './supabase/server'
import { getVerifiedUser, isAuthConnectionError } from './supabase/network'
import { getVerifiedStaffSession, type VerifiedStaffSession } from './staff-session'
import { TenantAuthError } from './tenant-auth-error'

type CookieReader = {
  get(name: string): { value: string } | undefined
  getAll?(): { name: string; value: string }[]
}
export interface AdminTenant {
  id: string
  slug: string | null
  organization_name: string
  status: string
  owner_id: string
  trial_ends_at: string | null
  subscription_plan: string | null
  subscription_stripe_id: string | null
  subscription_expires_at: string | null
  created_at: string
}
const columns = 'id,slug,organization_name,status,owner_id,trial_ends_at,subscription_plan,subscription_stripe_id,subscription_expires_at,created_at'

async function tenantFor(db: SupabaseClient, slug: string, staffTenantId?: string, ownerId?: string) {
  let query = db.from('tenants').select(columns).retry(false).abortSignal(AbortSignal.timeout(8000))
  query = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    ? query.eq('id', slug) : query.eq('slug', slug)
  if (staffTenantId) query = query.eq('id', staffTenantId)
  if (ownerId) query = query.eq('owner_id', ownerId)
  const { data, error } = await query.maybeSingle()
  if (error) throw new TenantAuthError('Forbidden', 503)
  return data as AdminTenant | null
}

export async function resolveAdminAccess(slug: string, store: CookieReader) {
  let staffSession: VerifiedStaffSession | null = null
  try {
    staffSession = await getVerifiedStaffSession(store)
  } catch (error) {
    if (!(error instanceof TenantAuthError) || error.status >= 500) throw error
  }
  const staffAdmin = staffSession?.permissions.some(p => p.startsWith('admin_'))
  let tenant: AdminTenant | null = null
  if (staffAdmin && staffSession) {
    // Service access is bound to BOTH the requested route and verified staff tenant.
    tenant = await tenantFor(createServiceClient(), slug, staffSession.tenantId)
    if (tenant?.id !== staffSession.tenantId) tenant = null
  }

  let user: User | null = null
  let ownerClient: Awaited<ReturnType<typeof createClient>> | null = null
  const hasOwnerCookie = store.getAll?.().some(c => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
  if (!tenant || hasOwnerCookie) {
    ownerClient = await createClient()
    try {
      user = await getVerifiedUser(ownerClient)
    } catch (error) {
      if (!isAuthConnectionError(error)) throw error
      if (!tenant) throw new TenantAuthError('Unauthorized', 503)
      // A verified staff session remains usable if independent owner Auth is down.
    }
    if (!tenant && user) tenant = await tenantFor(ownerClient, slug, undefined, user.id)
  }

  const isOwner = Boolean(user && tenant?.owner_id === user.id)
  const isStaffAdmin = Boolean(tenant && staffAdmin && staffSession?.tenantId === tenant.id)
  return { tenant, user, ownerClient, staffSession, isOwner, isStaffAdmin }
}
