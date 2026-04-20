import { createServiceClient } from '@/lib/supabase/server'
import { canCreateOrder } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRFToken, sendCSRFErrorResponse } from '@/lib/csrf'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') || '50'

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // SECURITY: Verify user owns the tenant (admin dashboard access)
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers')
    try {
      const { tenantId } = await verifyTenantOwnership(request, domain)

      const supabase = createServiceClient()

      let query = supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit))

      if (status) {
        query = query.eq('status', status)
      }

      const { data: orders, error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ orders: orders || [] })
    } catch (authError) {
      const { sendErrorResponse } = await import('@/lib/auth-helpers')
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500
      return sendErrorResponse(authError, statusCode)
    }
  } catch (err) {
    console.error('Orders GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify CSRF token
    const isValidCSRF = await verifyCSRFToken(request)
    if (!isValidCSRF) {
      return sendCSRFErrorResponse()
    }

    const body = await request.json()
    const { tenantId, items, customerInfo, deliveryType, deliveryAddress, notes, paymentMethod, tableNumber, waiterName, table_id, waiter_id, amountPaid } = body

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // SECURITY: Validate that tenantId corresponds to an active restaurant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Invalid restaurant' }, { status: 400 })
    }

    // Plan limit: check monthly order count
    const orderCheck = await canCreateOrder(tenantId)
    if (!orderCheck.allowed) {
      return NextResponse.json({ error: orderCheck.reason, limitReached: true, used: orderCheck.used, limit: orderCheck.limit }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee')
      .eq('tenant_id', tenantId)
      .single()

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.qty, 0)
    const tax = settings?.tax_rate ? subtotal * (settings.tax_rate / 100) : 0
    const deliveryFee = deliveryType === 'delivery' ? (settings?.delivery_fee || 0) : 0
    const total = subtotal + tax + deliveryFee

    const orderNumber = `ORD-${Date.now()}`
    const orderData: any = {
      tenant_id: tenantId,
      order_number: orderNumber,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email || null,
      customer_phone: customerInfo.phone,
      items,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      payment_method: paymentMethod,
      payment_status: 'pending',
      delivery_type: deliveryType,
      delivery_address: deliveryAddress || null,
      table_number: tableNumber || null,
      waiter_name: waiterName || null,
      notes: notes || null,
      status: 'pending',
    }

    // Only add these fields if they exist in the schema
    if (table_id) orderData.table_id = table_id
    if (waiter_id) orderData.waiter_id = waiter_id

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-create order_items so KDS can display the order in real-time
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItemsData = items.map((item: any) => ({
        order_id: order.id,
        tenant_id: tenantId,
        menu_item_id: item.menu_item_id || null,
        name: item.name,
        quantity: item.qty ?? item.quantity ?? 1,
        price: item.price,
        notes: item.notes || null,
        status: 'pending',
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) {
        // Non-blocking: order is already saved, just log the error
        console.error('Error creating order_items for KDS:', itemsError.message)
      }
    }

    return NextResponse.json({ orderId: order.id, orderNumber })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
