import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderStatusUpdate } from '@/lib/email'
import { sendWhatsAppOrderStatus } from '@/lib/whatsapp'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orderId = id

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (err) {
    console.error('Get order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orderId = id
    const body = await request.json()
    const { status } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send status update email (non-blocking)
    if (order.customer_email && ['preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
      const { data: branding } = await supabase
        .from('tenant_branding')
        .select('app_name, primary_color')
        .eq('tenant_id', order.tenant_id)
        .maybeSingle()
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('organization_name')
        .eq('id', order.tenant_id)
        .maybeSingle()

      const rName = branding?.app_name || tenantRow?.organization_name || 'Restaurante'
      sendOrderStatusUpdate(order.customer_email, {
        restaurantName: rName,
        primaryColor: branding?.primary_color,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        status,
      }).catch(e => console.error('[email] status update:', e))

      if (order.customer_phone) {
        sendWhatsAppOrderStatus(order.customer_phone, {
          restaurantName: rName,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          status,
        }).catch(e => console.error('[whatsapp] status update:', e))
      }
    }

    return NextResponse.json({ order })
  } catch (err) {
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
