import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const phone = request.nextUrl.searchParams.get('phone')

  if (!tenantId || !phone) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, items, total, created_at, delivery_type, payment_method')
    .eq('tenant_id', tenantId)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ orders: orders || [] })
}
