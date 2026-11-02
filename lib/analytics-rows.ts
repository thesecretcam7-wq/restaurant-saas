import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchAnalyticsRows(
  client: SupabaseClient,
  tenantId: string,
  table: 'orders' | 'order_items',
  columns: string,
  bounds?: { start: string; end: string },
  callerSignal?: AbortSignal,
) {
  const signal = callerSignal ? AbortSignal.any([callerSignal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000)
  const rows: any[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    let query = client.from(table).select(columns).eq('tenant_id', tenantId)
    if (bounds) query = query.gte('created_at', bounds.start).lt('created_at', bounds.end)
    const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(from, from + size - 1).retry(false).abortSignal(signal)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < size) return rows
  }
}
