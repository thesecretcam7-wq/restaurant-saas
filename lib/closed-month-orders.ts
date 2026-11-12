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
    const query = supabase.rpc('get_closed_cash_order_ids', {
      p_tenant_id: tenantId, p_start: monthStartIso, p_end: monthEndIso || null,
      p_limit: pageSize, p_offset: from,
    })
    const { data, error } = await query
      .retry(false)
      .abortSignal(signal)

    if (error) throw error
    for (const row of data || []) {
      if (row.order_id) ids.add(row.order_id)
    }
    if (!data || data.length < pageSize) return ids
  }
}
