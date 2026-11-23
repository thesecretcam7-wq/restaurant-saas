import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantAccess } from './tenant-api-auth'
import { writeAuditLog } from './audit-log'

export function orderActorEventId(tenantId: string, orderId: string, stage: string) {
  const hex = createHash('sha256').update(['order-actor-v1', tenantId, orderId, stage].join('|')).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4]
  const value = hex.join('')
  return [value.slice(0, 8), value.slice(8, 12), value.slice(12, 16), value.slice(16, 20), value.slice(20)].join('-')
}

// Audit failure must not turn a saved checkout into a failed or repeated payment.
export async function recordOrderActor(db: SupabaseClient, input: {
  tenantId: string; orderId: string; actor?: TenantAccess; stage: 'registered' | 'registered_paid' | 'paid'; source?: string
}) {
  if (!input.actor) return
  try {
    await writeAuditLog(db, {
      tenantId: input.tenantId, actor: input.actor,
      action: input.stage === 'registered' ? 'order.registered' : input.stage === 'registered_paid' ? 'sale.registered_paid' : 'sale.paid',
      entityType: 'order', entityId: input.orderId,
      eventId: orderActorEventId(input.tenantId, input.orderId, input.stage === 'registered_paid' ? 'paid' : input.stage),
      metadata: { source: input.source || null },
    })
  } catch {
    console.warn('[order audit] Responsible could not be recorded')
  }
}
