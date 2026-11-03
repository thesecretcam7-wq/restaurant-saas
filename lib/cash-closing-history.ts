import type { SupabaseClient } from '@supabase/supabase-js'

/** Full history for the selected local month, never a sample of recent months. */
export async function fetchMonthCashClosings<T>(
  supabase: SupabaseClient,
  tenantId: string,
  start: string,
  end: string,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    signal.throwIfAborted()
    const { data, error } = await supabase.from('cash_closings')
      .select('id, staff_id, staff_name, closed_at, cash_sales, card_sales, other_sales, total_sales, total_tax, total_discount, total_delivery_fees, delivery_order_count, expected_total, actual_cash_count, difference, is_balanced, transaction_count, orders_completed, orders_cancelled, notes, period_start, period_end')
      .eq('tenant_id', tenantId)
      .gte('closed_at', start)
      .lt('closed_at', end)
      .order('closed_at', { ascending: false })
      .order('id')
      .range(from, from + pageSize - 1)
      .retry(false)
      .abortSignal(signal)
    if (error) throw error
    rows.push(...(data || []) as T[])
    if (!data || data.length < pageSize) return rows
  }
}
