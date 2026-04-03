import { createServiceClient } from '@/lib/supabase/server'
import { canCreateOrder } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, items, customerInfo, deliveryType, deliveryAddress, notes, paymentMethod } = body

    // Plan limit: check monthly order count
    const orderCheck = await canCreateOrder(tenantId)
    if (!orderCheck.allowed) {
      return NextResponse.json({ error: orderCheck.reason, limitReached: true, used: orderCheck.used, limit: orderCheck.limit }, { status: 403 })
    }

    const supabase = await createServiceClient()

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
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
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
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ orderId: order.id, orderNumber })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
