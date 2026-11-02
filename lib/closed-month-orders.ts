import type { SupabaseClient } from '@supabase/supabase-js'

// Scope by order date, not closing date: a later closing can include older sales.
export async function fetchClosedMonthOrderIds(
  supabase: SupabaseClient,
  tenantId: string,
  monthStartIso: string,
  monthEndIso?: string,
) {
  const ids = new Set<string>()
  const signal = AbortSignal.timeout(8_000)
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from('cash_closing_items')
      .select('order_id, orders!inner(created_at)')
      .eq('tenant_id', tenantId)
      .eq('orders.tenant_id', tenantId)
      .gte('orders.created_at', monthStartIso)
    if (monthEndIso) query = query.lt('orders.created_at', monthEndIso)
    const { data, error } = await query
      .order('id')
      .range(from, from + pageSize - 1)
      .retry(false)
      .abortSignal(signal)

    if (error) throw error
    for (const row of data || []) {
      if (row.order_id) ids.add(row.order_id)
    }
    if (!data || data.length < pageSize) return ids
  }
}
