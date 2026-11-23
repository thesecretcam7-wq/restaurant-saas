import type { SupabaseClient } from '@supabase/supabase-js'
import { REVIEW_AUDIT_ACTIONS, reviewTicket } from './sales-review'

export async function fetchReviewTickets(db: SupabaseClient, tenantId: string, start: string, end: string, signal: AbortSignal) {
  const orders: any[] = []
  const orderIds = new Set<string>()
  for (let offset = 0; ; offset += 500) {
    const result = await db.from('orders').select('id,order_number,created_at,updated_at,table_number,waiter_name,total,payment_status,payment_method,status,items')
      .eq('tenant_id',tenantId).gte('created_at',start).lt('created_at',end)
      .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+499).retry(false).abortSignal(signal)
    if (result.error) throw result.error
    for (const order of result.data || []) {
      if (!orderIds.has(order.id)) { orderIds.add(order.id); orders.push(order) }
    }
    if ((result.data || []).length < 500) break
    if (offset >= 9500) throw Error('La jornada supera el límite de consulta. Contacta con soporte para revisar el intervalo sin ocultar tickets.')
  }
  const audit: any[] = []
  for (let from = 0; from < orders.length; from += 100) {
    const ids = orders.slice(from,from+100).map(order => order.id)
    for (let offset = 0; ; offset += 500) {
      const result = await db.from('audit_logs').select('entity_id,action,actor_type,actor_id,actor_name,created_at,reason,metadata')
        .eq('tenant_id',tenantId).eq('entity_type','order').in('entity_id',ids).in('action',REVIEW_AUDIT_ACTIONS)
        .order('created_at').order('id').range(offset,offset+499).retry(false).abortSignal(signal)
      if (result.error) throw result.error
      audit.push(...(result.data || []))
      if ((result.data || []).length < 500) break
      if (audit.length >= 20000) throw Error('Hay demasiados cambios en esta jornada para una consulta completa.')
    }
  }
  const byOrder = new Map<string,any[]>()
  for (const event of audit) byOrder.set(event.entity_id,[...(byOrder.get(event.entity_id) || []),event])
  return orders.map(order => reviewTicket(order,byOrder.get(order.id)))
}
