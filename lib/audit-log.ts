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
  }: AuditEntity
) {
  const actorType = actor?.type || 'system'

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      tenant_id: tenantId,
      actor_type: actorType,
      actor_id: actor?.staffId || actor?.userId || null,
      actor_role: actor?.role || (actorType === 'owner' ? 'owner' : null),
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      reason: reason || null,
      metadata,
    })

  if (error) {
    console.error('[audit] log insert error:', error.message)
  }
}
