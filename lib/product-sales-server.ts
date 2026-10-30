import type { SupabaseClient } from '@supabase/supabase-js'
import { addRestaurantLocalDays, getRestaurantLocalDateStartUtc } from './restaurant-time'
import { isProductSalesDate, summarizeProductSales } from './product-sales'

export async function fetchDailyProductSales(
  supabase: SupabaseClient, tenantId: string, date: string, timeZone: string,
  signal = AbortSignal.timeout(8_000),
) {
  if (!isProductSalesDate(date)) throw new Error('Invalid report date')
  const start = getRestaurantLocalDateStartUtc(date, timeZone)!.toISOString()
  const end = getRestaurantLocalDateStartUtc(addRestaurantLocalDays(date, 1), timeZone)!.toISOString()
  const orders = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('orders')
      .select('id, status, payment_status, items')
      .eq('tenant_id', tenantId).eq('payment_status', 'paid')
      .gte('created_at', start).lt('created_at', end)
      .order('created_at', { ascending: false }).order('id')
      .range(from, from + pageSize - 1).retry(false).abortSignal(signal)
    if (error) throw error
    orders.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return summarizeProductSales(orders)
}
