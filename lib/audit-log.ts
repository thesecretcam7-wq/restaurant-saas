import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantAccess } from '@/lib/tenant-api-auth'

type AuditEntity = {
  tenantId: string
  actor?: TenantAccess
  action: string
  entityType: string
  entityId?: string | null
  reason?: string | null
  metadata?: Record<string, unknown>
  eventId?: string
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  {
    tenantId,
    actor,
    action,
    entityType,
    entityId,
    reason,
    metadata = {},
    eventId,
  }: AuditEntity
) {
  const actorType = actor?.type || 'system'

  const entry = {
      tenant_id: tenantId,
      actor_type: actorType,
      actor_id: actor?.staffId || actor?.userId || null,
      actor_name: actor?.staffName || (actorType === 'owner' ? 'Propietario' : null),
      actor_role: actor?.role || (actorType === 'owner' ? 'owner' : null),
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      reason: reason || null,
      metadata,
    }
  try {
    const table = supabase.from('audit_logs')
    const query = eventId
      ? table.upsert({ ...entry, id: eventId }, { onConflict: 'id', ignoreDuplicates: true })
      : table.insert(entry)
    const { error } = await query.retry(false).abortSignal(AbortSignal.timeout(5000))
    if (error) console.error('[audit] log insert error:', error.message)
  } catch {
    console.warn('[audit] log could not be saved')
  }
}
