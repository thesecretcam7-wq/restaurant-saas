import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderStatusUpdate } from '@/lib/email'
import { sendWhatsAppOrderStatus } from '@/lib/whatsapp'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

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
    const { status, payment_status } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!status && !payment_status) {
      return NextResponse.json({ error: 'Status or payment_status is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existingOrder, error: existingError } = await supabase
      .from('orders')
      .select('id, tenant_id')
      .eq('id', orderId)
      .single()

    if (existingError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await requireTenantAccess(existingOrder.tenant_id, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] })

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // When confirming an order, ensure order_items exist for KDS visibility.
    // Kiosk cash orders skip order_items at creation time, so we create them here.
    if (status === 'confirmed' && Array.isArray(order.items) && order.items.length > 0) {
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      if ((count ?? 0) === 0) {
        const orderItemsData = order.items.map((item: any) => ({
          order_id: orderId,
          tenant_id: order.tenant_id,
          menu_item_id: item.menu_item_id || null,
          name: item.name,
          quantity: item.qty ?? item.quantity ?? 1,
          price: item.price,
          notes: item.notes || null,
          status: 'pending',
        }))
        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
        if (itemsError) console.error('[orders PATCH] order_items creation error:', itemsError.message)
      }
    }

    if ((status === 'delivered' || payment_status === 'paid') && order.tenant_id) {
      const itemUpdate: Record<string, any> = {
        status: status === 'delivered' ? 'delivered' : 'ready',
        updated_at: new Date().toISOString(),
      }
      if (status === 'delivered') itemUpdate.completed_at = new Date().toISOString()

      const { error: itemsPaidError } = await supabase
        .from('order_items')
        .update(itemUpdate)
        .eq('order_id', orderId)
        .eq('tenant_id', order.tenant_id)
        .neq('status', 'cancelled')

      if (itemsPaidError) console.error('[orders PATCH] order_items payment sync error:', itemsPaidError.message)
    }

    // Send status update email (non-blocking)
    if (order.customer_email && status && ['preparing', 'ready', 'delivered', 'cancelled'].includes(status)) {
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
    if (err instanceof Error && ['Unauthorized', 'Forbidden'].includes(err.message)) {
      return tenantAuthErrorResponse(err)
    }
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
