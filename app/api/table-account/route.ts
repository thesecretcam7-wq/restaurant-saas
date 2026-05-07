import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    const tableNumber = request.nextUrl.searchParams.get('tableNumber')

    if (!tenantId || !tableNumber) {
      return NextResponse.json({ error: 'tenantId and tableNumber are required' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero'] })

    const table = Number(tableNumber)
    if (!Number.isFinite(table)) {
      return NextResponse.json({ error: 'Invalid tableNumber' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, table_number, waiter_name, subtotal, tax, total, created_at, items, payment_status, status, delivery_type')
      .eq('tenant_id', tenantId)
      .eq('delivery_type', 'dine-in')
      .eq('table_number', table)
      .or('payment_status.is.null,payment_status.eq.pending')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data || [] })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }
}
