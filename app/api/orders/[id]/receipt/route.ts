import { createServiceClient } from '@/lib/supabase/server'
import { getCurrencyByCountry } from '@/lib/currency'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenantId = request.nextUrl.searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] })
    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, tenant_id, items, subtotal, tax, total, created_at, waiter_name, table_number')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const [{ data: settings }, { data: tenant }] = await Promise.all([
      supabase
        .from('restaurant_settings')
        .select('display_name, phone, default_receipt_printer_id, country, tax_rate')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('tenants')
        .select('organization_name, country')
        .eq('id', tenantId)
        .maybeSingle(),
    ])

    const country = settings?.country || tenant?.country || 'CO'
    const currencyInfo = getCurrencyByCountry(country)
    const total = Number(order.total || 0)
    const amountPaid = total

    return NextResponse.json({
      defaultPrinterId: settings?.default_receipt_printer_id || null,
      receipt: {
        orderId: order.id,
        orderNumber: order.order_number || order.id.slice(0, 8),
        restaurantName: settings?.display_name || tenant?.organization_name || 'Restaurante',
        restaurantPhone: settings?.phone || null,
        items: (order.items || []).map((item: any) => ({
          menu_item_id: item.menu_item_id || item.item_id || '',
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.qty ?? item.quantity ?? 1),
        })),
        subtotal: Number(order.subtotal || 0),
        discount: 0,
        tax: Number(order.tax || 0),
        taxRate: Number(settings?.tax_rate || 0),
        total,
        amountPaid,
        change: Math.max(0, amountPaid - total),
        currencyInfo,
        timestamp: order.created_at,
        waiterName: order.waiter_name || undefined,
        tableNumber: order.table_number || undefined,
      },
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error fetching receipt data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
