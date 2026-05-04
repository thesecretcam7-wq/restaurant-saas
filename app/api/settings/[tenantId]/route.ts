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
  const { data } = await supabase
    .from('restaurant_settings')
    .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, reservations_enabled')
    .eq('tenant_id', tenantId)
    .single()
  return NextResponse.json(data || {})
}
