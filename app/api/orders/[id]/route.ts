import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendOrderStatusUpdate } from '@/lib/email'
import { sendWhatsAppOrderStatus } from '@/lib/whatsapp'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { applyRecipeStockMovement } from '@/lib/inventory-recipes'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { buildOrderItemRows } from '@/lib/order-item-routing'
import { syncOrderDeliveredIfAllItemsDelivered } from '@/lib/order-status-sync'

function getOrderItemKey(item: any) {
  return String(item?.menu_item_id || item?.item_id || item?.id || item?.name || '').trim()
}

function getOrderItemQty(item: any) {
  const qty = Number(item?.qty ?? item?.quantity ?? 1)
  return Number.isFinite(qty) && qty > 0 ? qty : 1
}

function normalizePaymentMethod(method: unknown) {
  if (typeof method !== 'string') return null
  const value = method.trim().toLowerCase()
  if (value === 'tarjeta' || value === 'card') return 'stripe'
  if (value === 'cash' || value === 'stripe' || value === 'wompi' || value === 'mixed') return value
  return null
}

function normalizePaymentBreakdown(value: unknown, orderTotal: number, paymentMethod: string | null) {
  const total = Math.max(0, Number(orderTotal) || 0)
  const rows = Array.isArray(value) ? value : []
  const payments = rows
    .map((payment: any) => ({
      method: normalizePaymentMethod(payment?.method),
      amount: Math.round((Number(payment?.amount) || 0) * 100) / 100,
    }))
    .filter((payment: { method: string | null; amount: number }): payment is { method: string; amount: number } =>
      Boolean(payment.method) && payment.amount > 0
    )

  if (paymentMethod !== 'mixed') return null
  if (payments.length < 2) return null

  const paymentTotal = Math.round(payments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100
  if (Math.abs(paymentTotal - total) > 0.01) return null
  if (!payments.some((payment) => payment.method === 'cash')) return null
  if (!payments.some((payment) => payment.method !== 'cash')) return null

  return payments
}

function isMissingPaymentBreakdownColumn(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return text.includes('payment_breakdown') && (error?.code === '42703' || error?.code === 'PGRST204')
}

function getPaymentMethodLabel(method: string | null | undefined) {
  switch (normalizePaymentMethod(method) || method) {
    case 'cash':
      return 'Efectivo'
    case 'stripe':
      return 'Tarjeta'
    case 'wompi':
      return 'Wompi'
    case 'mixed':
      return 'Mixto'
    default:
      return method || 'Sin metodo'
  }
}

function getRemovedItems(previousItems: any[] = [], nextItems: any[] = []) {
  const nextQtyByKey = new Map<string, number>()
  nextItems.forEach((item) => {
    const key = getOrderItemKey(item)
    if (!key) return
    nextQtyByKey.set(key, (nextQtyByKey.get(key) || 0) + getOrderItemQty(item))
  })

  const removed: any[] = []
  previousItems.forEach((item) => {
    const key = getOrderItemKey(item)
    if (!key) return
    const previousQty = getOrderItemQty(item)
    const remainingQty = nextQtyByKey.get(key) || 0
    const removedQty = Math.max(0, previousQty - remainingQty)
    if (removedQty > 0) {
      removed.push({
        ...item,
        qty: removedQty,
        quantity: removedQty,
      })
      nextQtyByKey.set(key, Math.max(0, remainingQty - previousQty))
    } else {
      nextQtyByKey.set(key, Math.max(0, remainingQty - previousQty))
    }
  })

  return removed
}

function getAddedItems(previousItems: any[] = [], nextItems: any[] = []) {
  const previousQtyByKey = new Map<string, number>()
  previousItems.forEach((item) => {
    const key = getOrderItemKey(item)
    if (!key) return
    previousQtyByKey.set(key, (previousQtyByKey.get(key) || 0) + getOrderItemQty(item))
  })

  const added: any[] = []
  nextItems.forEach((item) => {
    const key = getOrderItemKey(item)
    if (!key) return
    const nextQty = getOrderItemQty(item)
    const previousQty = previousQtyByKey.get(key) || 0
    const addedQty = Math.max(0, nextQty - previousQty)
    if (addedQty > 0) {
      added.push({
        ...item,
        qty: addedQty,
        quantity: addedQty,
      })
      previousQtyByKey.set(key, 0)
    } else {
      previousQtyByKey.set(key, Math.max(0, previousQty - nextQty))
    }
  })

  return added
}

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
    const { status, payment_status, payment_method, payment_method_reason, cancel_reason, items, subtotal, tax, delivery_fee, total, edit_reason, delivery_type } = body
    const requestedPaymentBreakdown = body.payment_breakdown ?? body.paymentBreakdown
    const hasPaymentMethod = Object.prototype.hasOwnProperty.call(body, 'payment_method')
    const hasPaymentBreakdown = Object.prototype.hasOwnProperty.call(body, 'payment_breakdown') || Object.prototype.hasOwnProperty.call(body, 'paymentBreakdown')
    const normalizedPaymentMethod = hasPaymentMethod ? normalizePaymentMethod(payment_method) : null

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    if (!status && !payment_status && !hasPaymentMethod && !hasPaymentBreakdown && !Array.isArray(items)) {
      return NextResponse.json({ error: 'Status, payment_status, payment_method, payment_breakdown or items is required' }, { status: 400 })
    }

    if (hasPaymentMethod && !normalizedPaymentMethod) {
      return NextResponse.json({ error: 'Metodo de pago invalido' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const fetchExistingOrder = (select: string) => supabase
      .from('orders')
      .select(select)
      .eq('id', orderId)
      .single()

    let existingResult = await fetchExistingOrder('id, tenant_id, order_number, status, payment_status, payment_method, payment_breakdown, total, notes, items')
    if (existingResult.error && isMissingPaymentBreakdownColumn(existingResult.error)) {
      existingResult = await fetchExistingOrder('id, tenant_id, order_number, status, payment_status, payment_method, total, notes, items')
    }

    const existingOrder = existingResult.data as any
    const existingError = existingResult.error

    if (existingError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const access = await requireTenantAccess(existingOrder.tenant_id, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] })

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    const previousPaymentMethod = normalizePaymentMethod(existingOrder.payment_method) || existingOrder.payment_method || null
    const paymentMethodChanged = Boolean(
      hasPaymentMethod &&
      normalizedPaymentMethod &&
      normalizedPaymentMethod !== previousPaymentMethod
    )
    let sanitizedItemsForEdit: any[] | null = null
    let removedItemsForStockReturn: any[] = []
    let addedItemsForStockSale: any[] = []
    if (status) updateData.status = status
    if (payment_status) updateData.payment_status = payment_status
    if (hasPaymentMethod) updateData.payment_method = normalizedPaymentMethod
    if (hasPaymentBreakdown) {
      const paymentTotal = Number(total ?? existingOrder.total) || 0
      const breakdown = normalizePaymentBreakdown(requestedPaymentBreakdown, paymentTotal, normalizedPaymentMethod || existingOrder.payment_method)
      if ((normalizedPaymentMethod || existingOrder.payment_method) === 'mixed' && !breakdown) {
        return NextResponse.json({ error: 'El pago mixto debe incluir efectivo y tarjeta por el total exacto.' }, { status: 400 })
      }
      updateData.payment_breakdown = breakdown
    }
    if (Array.isArray(items)) {
      const sanitizedItems = items
        .map((item: any) => ({
          menu_item_id: item.menu_item_id || item.item_id || item.id || null,
          name: String(item.name || '').trim(),
          price: Math.max(0, Number(item.price || 0)),
          qty: Math.max(1, Number(item.qty ?? item.quantity ?? 1)),
          notes: item.notes || null,
          is_manual: item.is_manual === true || !(item.menu_item_id || item.item_id || item.id),
          requires_kitchen: item.requires_kitchen === false ? false : undefined,
        }))
        .filter((item: any) => item.name)

      sanitizedItemsForEdit = sanitizedItems
      removedItemsForStockReturn = getRemovedItems(Array.isArray(existingOrder.items) ? existingOrder.items : [], sanitizedItems)
      addedItemsForStockSale = getAddedItems(Array.isArray(existingOrder.items) ? existingOrder.items : [], sanitizedItems)
      updateData.items = sanitizedItems
      updateData.subtotal = Math.max(0, Number(subtotal ?? sanitizedItems.reduce((sum: number, item: any) => sum + item.price * item.qty, 0)))
      updateData.tax = Math.max(0, Number(tax ?? 0))
      updateData.delivery_fee = Math.max(0, Number(delivery_fee ?? 0))
      updateData.total = Math.max(0, Number(total ?? updateData.subtotal + updateData.tax + updateData.delivery_fee))
      if (typeof delivery_type === 'string' && ['delivery', 'pickup', 'takeaway', 'dine-in'].includes(delivery_type)) {
        updateData.delivery_type = delivery_type
      }
      if (sanitizedItems.length === 0 && !status) {
        updateData.status = 'cancelled'
      }

      const timestamp = new Date().toISOString()
      const reason = typeof edit_reason === 'string' && edit_reason.trim()
        ? edit_reason.trim()
        : sanitizedItems.length === 0
          ? 'Pedido sin productos anulado desde TPV'
          : 'Recibo editado desde TPV'
      const editNote = sanitizedItems.length === 0
        ? `Anulado ${timestamp}: ${reason}`
        : `Editado ${timestamp}: ${reason}`
      updateData.notes = existingOrder.notes
        ? `${existingOrder.notes}\n${editNote}`
        : editNote
    }
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
    if (paymentMethodChanged) {
      const timestamp = new Date().toISOString()
      const reason = typeof payment_method_reason === 'string' && payment_method_reason.trim()
        ? payment_method_reason.trim()
        : typeof edit_reason === 'string' && edit_reason.trim()
          ? edit_reason.trim()
          : 'Correccion de forma de pago desde TPV'
      const paymentNote = `Metodo de pago corregido ${timestamp}: ${getPaymentMethodLabel(previousPaymentMethod)} -> ${getPaymentMethodLabel(normalizedPaymentMethod)}. ${reason}`
      const baseNotes = typeof updateData.notes === 'string' ? updateData.notes : existingOrder.notes
      updateData.notes = baseNotes
        ? `${baseNotes}\n${paymentNote}`
        : paymentNote
    }

    if (payment_status === 'paid' && existingOrder.payment_status !== 'paid') {
      try {
        await applyRecipeStockMovement(supabase, {
          ...existingOrder,
          items: sanitizedItemsForEdit || existingOrder.items,
        }, 'sale')
      } catch (stockError) {
        return NextResponse.json(
          { error: stockError instanceof Error ? stockError.message : 'No se pudo descontar inventario' },
          { status: 400 }
        )
      }
    }

    if (sanitizedItemsForEdit && existingOrder.payment_status === 'paid' && addedItemsForStockSale.length > 0) {
      try {
        await applyRecipeStockMovement(supabase, {
          id: existingOrder.id,
          tenant_id: existingOrder.tenant_id,
          order_number: existingOrder.order_number,
          items: addedItemsForStockSale,
          stock_reference_id: `${existingOrder.id}:partial-sale:${Date.now()}`,
          stock_notes: `Venta parcial por edicion de recibo ${existingOrder.order_number || existingOrder.id}`,
        }, 'sale')
      } catch (stockError) {
        return NextResponse.json(
          { error: stockError instanceof Error ? stockError.message : 'No se pudo descontar inventario del producto agregado' },
          { status: 400 }
        )
      }
    }

    const updateOrder = (payload: Record<string, any>) => supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId)
      .select()
      .single()

    let updateResult = await updateOrder(updateData)
    if (updateResult.error && isMissingPaymentBreakdownColumn(updateResult.error)) {
      const fallbackUpdateData = { ...updateData }
      delete fallbackUpdateData.payment_breakdown
      updateResult = await updateOrder(fallbackUpdateData)
    }

    const { data: order, error } = updateResult

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

    // When confirming an order, ensure order_items exist for kitchen/service visibility.
    // Kiosk cash orders skip order_items at creation time, so we create them here.
    if (status === 'confirmed' && Array.isArray(order.items) && order.items.length > 0) {
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('kds_enabled')
        .eq('tenant_id', order.tenant_id)
        .maybeSingle()

      const { count } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      if ((count ?? 0) === 0) {
        const orderItemsData = buildOrderItemRows({
          orderId,
          tenantId: order.tenant_id,
          items: order.items,
          includeKitchenItems: settings?.kds_enabled === true,
        })

        if (orderItemsData.length === 0) {
          return NextResponse.json({ order })
        }

        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
        if (itemsError) console.error('[orders PATCH] order_items creation error:', itemsError.message)
      }
    }

    let responseOrder = order
    if (payment_status === 'paid' && status !== 'delivered' && order.tenant_id) {
      try {
        const syncedStatus = await syncOrderDeliveredIfAllItemsDelivered(supabase, {
          orderId,
          tenantId: order.tenant_id,
        })
        if (syncedStatus === 'delivered') {
          responseOrder = { ...order, status: 'delivered' }
        }
      } catch (syncError) {
        console.error('[orders PATCH] delivered parent sync error:', syncError)
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

    if (sanitizedItemsForEdit && existingOrder.payment_status === 'paid' && removedItemsForStockReturn.length > 0) {
      try {
        await applyRecipeStockMovement(supabase, {
          id: order.id,
          tenant_id: order.tenant_id,
          order_number: order.order_number,
          items: removedItemsForStockReturn,
          stock_reference_id: `${order.id}:partial-return:${Date.now()}`,
          stock_notes: `Devolucion parcial por edicion de recibo ${order.order_number || order.id}`,
        }, 'return')
      } catch (stockError) {
        console.error('[orders PATCH] partial stock return error:', stockError)
      }
    }

    if (Array.isArray(items)) {
      await writeAuditLog(supabase, {
        tenantId: order.tenant_id,
        actor: access,
        action: 'sale.edited',
        entityType: 'order',
        entityId: orderId,
        reason: edit_reason || 'Recibo editado desde TPV',
        metadata: {
          order_number: order.order_number || existingOrder.order_number,
          previous_total: Number(existingOrder.total || 0),
          new_total: Number(order.total || 0),
          previous_items_count: Array.isArray(existingOrder.items) ? existingOrder.items.length : 0,
          new_items_count: Array.isArray(order.items) ? order.items.length : 0,
        },
      })
    }

    if (paymentMethodChanged) {
      await writeAuditLog(supabase, {
        tenantId: order.tenant_id,
        actor: access,
        action: 'sale.payment_method_corrected',
        entityType: 'order',
        entityId: orderId,
        reason: payment_method_reason || edit_reason || 'Correccion de forma de pago desde TPV',
        metadata: {
          order_number: order.order_number || existingOrder.order_number,
          total: Number(order.total ?? existingOrder.total) || 0,
          previous_payment_method: previousPaymentMethod,
          new_payment_method: normalizedPaymentMethod,
          payment_status: order.payment_status,
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

    return NextResponse.json({ order: responseOrder })
  } catch (err) {
    if (err instanceof Error && ['Unauthorized', 'Forbidden'].includes(err.message)) {
      return tenantAuthErrorResponse(err)
    }
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
