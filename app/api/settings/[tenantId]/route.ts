import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('restaurant_settings')
    .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, reservations_enabled')
    .eq('tenant_id', tenantId)
    .single()
  return NextResponse.json(data || {})
}
