import type { createServiceClient } from '@/lib/supabase/server'

/** Return exact historical totals without downloading historical order rows. */
export async function fetchSalesHistoryTotals(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
) {
  const { data, error } = await supabase
    .rpc('get_sales_history_totals', { p_tenant_id: tenantId })
    .retry(false)
    .abortSignal(AbortSignal.timeout(8_000))
    .returns<{ total_revenue: number | string; sale_count: number | string }[]>()
    .single()
  if (error) throw error
  const revenue = Number(data?.total_revenue)
  const count = Number(data?.sale_count)
  if (!data || !Number.isFinite(revenue) || !Number.isSafeInteger(count) || count < 0) {
    throw new Error('No se pudieron consultar los totales históricos de ventas')
  }
  return { revenue, count }
}
