import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function resolveTenantId(supabase: ReturnType<typeof createServiceClient>, slugOrId: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(slugOrId)) return slugOrId

  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slugOrId)
    .maybeSingle()

  return data?.id || slugOrId
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId: slugOrId } = await params
  const supabase = createServiceClient()
  const tenantId = await resolveTenantId(supabase, slugOrId)
  let { data, error } = await supabase
    .from('restaurant_settings')
    .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, reservations_enabled, country, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.warn('[settings] full settings query failed, using safe fallback:', error.message)
    const fallback = await supabase
      .from('restaurant_settings')
      .select('delivery_enabled, delivery_fee, cash_payment_enabled, tax_rate')
      .eq('tenant_id', tenantId)
      .maybeSingle()
      data = fallback.data ? {
        ...fallback.data,
        delivery_min_order: 0,
        delivery_time_minutes: null,
        reservations_enabled: false,
        country: null,
        online_payment_provider: 'stripe',
        wompi_enabled: false,
        wompi_environment: 'sandbox',
        wompi_public_key: null,
      } : null
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, country')
    .eq('id', tenantId)
    .maybeSingle()

  return NextResponse.json({
    ...(data || {}),
    tenant_id: tenantId,
    country: data?.country || tenant?.country || 'ES',
    online_payment_provider: data?.online_payment_provider || 'stripe',
    wompi_enabled: Boolean(data?.wompi_enabled && data?.wompi_public_key),
  })
}
