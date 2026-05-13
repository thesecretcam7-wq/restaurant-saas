import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderStatusUpdate } from '@/lib/email'
import { sendWhatsAppOrderStatus } from '@/lib/whatsapp'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { applyRecipeStockMovement } from '@/lib/inventory-recipes'
import { deriveBrandPalette } from '@/lib/brand-colors'

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

    await requireTenantAccess(order.tenant_id, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] })

    return NextResponse.json({ order })
  } catch (err) {
    if (err instanceof Error && ['Unauthorized', 'Forbidden'].includes(err.message)) {
      return tenantAuthErrorResponse(err)
    }
    console.error('Get order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const orderId = id
    const body = await request.json()
    const { status, payment_status, payment_method, cancel_reason } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!status && !payment_status && !payment_method) {
      return NextResponse.json({ error: 'Status, payment_status or payment_method is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existingOrder, error: existingError } = await supabase
      .from('orders')
      .select('id, tenant_id, order_number, status, payment_status, total, notes, items')
      .eq('id', orderId)
      .single()

    if (existingError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const access = await requireTenantAccess(existingOrder.tenant_id, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] })

    if (payment_status === 'paid' && existingOrder.payment_status !== 'paid') {
      try {
        await applyRecipeStockMovement(supabase, existingOrder, 'sale')
      } catch (stockError) {
        return NextResponse.json(
          { error: stockError instanceof Error ? stockError.message : 'No se pudo descontar inventario' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status
    if (payment_method) updateData.payment_method = payment_method
    if (status === 'cancelled') {
      const timestamp = new Date().toISOString()
      const reason = typeof cancel_reason === 'string' && cancel_reason.trim()
        ? cancel_reason.trim()
        : 'Anulado desde el sistema'
      const auditNote = `Anulado ${timestamp}: ${reason}`
      updateData.notes = existingOrder.notes
        ? `${existingOrder.notes}\n${auditNote}`
        : auditNote
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (status === 'cancelled' && existingOrder.payment_status === 'paid') {
      try {
        await applyRecipeStockMovement(supabase, existingOrder, 'return')
      } catch (stockError) {
        console.error('[orders PATCH] stock return error:', stockError)
      }
    }

    // When confirming an order, ensure order_items exist for KDS visibility.
    // Kiosk cash orders skip order_items at creation time, so we create them here.
    if (status === 'confirmed' && Array.isArray(order.items) && order.items.length > 0) {
      const kitchenItems = order.items.filter((item: any) => item.requires_kitchen !== false)
      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      if ((count ?? 0) === 0 && kitchenItems.length > 0) {
        const orderItemsData = kitchenItems.map((item: any) => ({
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

    // Payment and kitchen progress are separate flows: paying should not mark KDS items ready.
    if (status === 'delivered' && order.tenant_id) {
      const itemUpdate: Record<string, any> = {
        status: 'delivered',
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }

      const { error: itemsDeliveredError } = await supabase
        .from('order_items')
        .update(itemUpdate)
        .eq('order_id', orderId)
        .eq('tenant_id', order.tenant_id)
        .neq('status', 'cancelled')

      if (itemsDeliveredError) console.error('[orders PATCH] order_items delivered sync error:', itemsDeliveredError.message)
    }

    if (status === 'cancelled' && order.tenant_id) {
      const { error: itemsCancelledError } = await supabase
        .from('order_items')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .eq('tenant_id', order.tenant_id)
        .neq('status', 'delivered')

      if (itemsCancelledError) console.error('[orders PATCH] order_items cancel sync error:', itemsCancelledError.message)

      await writeAuditLog(supabase, {
        tenantId: order.tenant_id,
        actor: access,
        action: order.payment_status === 'paid' || existingOrder.payment_status === 'paid'
          ? 'sale.voided'
          : 'order.cancelled',
        entityType: 'order',
        entityId: orderId,
        reason: updateData.notes?.split('\n').pop() || cancel_reason || 'Anulado desde el sistema',
        metadata: {
          order_number: order.order_number || existingOrder.order_number,
          total: Number(order.total ?? existingOrder.total) || 0,
          previous_status: existingOrder.status,
          previous_payment_status: existingOrder.payment_status,
          new_status: order.status,
          new_payment_status: order.payment_status,
        },
      })
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
      const palette = deriveBrandPalette()
      sendOrderStatusUpdate(order.customer_email, {
        restaurantName: rName,
        primaryColor: palette.buttonPrimary,
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
