import { createServiceClient } from '@/lib/supabase/server'
import { canCreateOrder } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRFToken, sendCSRFErrorResponse } from '@/lib/csrf'
import { sendOrderConfirmation, sendNewOrderNotification } from '@/lib/email'
import { sendWhatsAppOrderConfirmation } from '@/lib/whatsapp'
import { orderLimiter, checkRateLimit, getClientIp } from '@/lib/ratelimit'

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
    // Rate limiting
    const ip = getClientIp(request)
    const rl = await checkRateLimit(orderLimiter, ip)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }, { status: 429 })
    }

    // SECURITY: Verify CSRF token
    const isValidCSRF = await verifyCSRFToken(request)
    if (!isValidCSRF) {
      return sendCSRFErrorResponse()
    }

    const body = await request.json()
    const { tenantId: tenantParam, items, customerInfo, deliveryType, deliveryAddress, notes, paymentMethod, tableNumber, waiterName, table_id, waiter_id, amountPaid, source } = body

    if (!tenantParam) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // SECURITY: Validate that tenantId corresponds to an active restaurant
    const tenantLookup = String(tenantParam)
    const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantLookup)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq(isTenantUUID ? 'id' : 'slug', tenantLookup)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Invalid restaurant' }, { status: 400 })
    }

    const tenantId = tenant.id

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must include items' }, { status: 400 })
    }

    const itemIds = items
      .map((item: any) => item.menu_item_id || item.item_id || item.id)
      .filter(Boolean)

    if (itemIds.length !== items.length) {
      return NextResponse.json({ error: 'Every item must include a menu item id' }, { status: 400 })
    }

    const { data: menuRows, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, available')
      .eq('tenant_id', tenantId)
      .in('id', itemIds)

    if (menuError) {
      console.error('[orders POST] menu validation error:', menuError.message)
      return NextResponse.json({ error: 'Error validating menu items' }, { status: 500 })
    }

    const menuById = new Map((menuRows || []).map((item: any) => [item.id, item]))
    const sanitizedItems = items.map((item: any) => {
      const menuId = item.menu_item_id || item.item_id || item.id
      const menuItem = menuById.get(menuId)
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))

      if (!menuItem || menuItem.available === false) {
        throw new Error('MENU_ITEM_NOT_AVAILABLE')
      }

      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price) || 0,
        qty,
        notes: item.notes || null,
      }
    })

    // Plan limit: check monthly order count
    const orderCheck = await canCreateOrder(tenantId)
    if (!orderCheck.allowed) {
      return NextResponse.json({ error: orderCheck.reason, limitReached: true, used: orderCheck.used, limit: orderCheck.limit }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee, delivery_min_order, delivery_enabled, cash_payment_enabled')
      .eq('tenant_id', tenantId)
      .single()

    const subtotal = sanitizedItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0)

    if (source === 'store' && paymentMethod === 'cash' && settings?.cash_payment_enabled === false) {
      return NextResponse.json({ error: 'Pago en efectivo no esta habilitado para este restaurante' }, { status: 400 })
    }

    if (deliveryType === 'delivery') {
      if (settings?.delivery_enabled === false) {
        return NextResponse.json({ error: 'Delivery no esta habilitado para este restaurante' }, { status: 400 })
      }

      const minOrder = Number(settings?.delivery_min_order || 0)
      if (minOrder > 0 && subtotal < minOrder) {
        return NextResponse.json(
          { error: `El pedido minimo para delivery es ${minOrder}` },
          { status: 400 }
        )
      }
    }

    const tax = settings?.tax_rate ? subtotal * (settings.tax_rate / 100) : 0
    const deliveryFee = deliveryType === 'delivery' ? (settings?.delivery_fee || 0) : 0
    const total = subtotal + tax + deliveryFee

    const orderNumber = `ORD-${Date.now()}`

    // Compute daily sequential display number for this tenant
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayStart.toISOString())
    const displayNumber = (todayCount ?? 0) + 1

    const orderData: any = {
      tenant_id: tenantId,
      order_number: orderNumber,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email || null,
      customer_phone: customerInfo.phone,
      items: sanitizedItems,
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
      display_number: displayNumber,
    }

    // Only add these fields if they exist in the schema
    if (table_id) orderData.table_id = table_id
    if (waiter_id) orderData.waiter_id = waiter_id

    const { data: order, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (error) {
      console.error('[orders POST] insert error:', error.message, error.details, error.hint)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-create order_items so KDS can display the order in real-time.
    // Exception: kiosk cash orders skip this — items are created when cashier confirms payment.
    const isKioskCash = source === 'kiosk' && paymentMethod === 'cash'
    if (!isKioskCash && sanitizedItems.length > 0) {
      const orderItemsData = sanitizedItems.map((item: any) => ({
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

    // Send emails (non-blocking)
    const { data: branding } = await supabase
      .from('tenant_branding')
      .select('app_name, primary_color')
      .eq('tenant_id', tenantId)
      .maybeSingle()
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('organization_name, owner_email')
      .eq('id', tenantId)
      .maybeSingle()
    const { data: settings2 } = await supabase
      .from('restaurant_settings')
      .select('email')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const restaurantName = branding?.app_name || tenantRow?.organization_name || 'Restaurante'
    const primaryColor = branding?.primary_color || '#3B82F6'
    const adminEmail = settings2?.email || tenantRow?.owner_email

    if (orderData.customer_email) {
      sendOrderConfirmation(orderData.customer_email, {
        restaurantName,
        primaryColor,
        orderNumber,
        customerName: orderData.customer_name,
        items: sanitizedItems.map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
        subtotal,
        tax,
        deliveryFee,
        total,
        deliveryType,
        deliveryAddress: deliveryAddress || undefined,
        paymentMethod,
        notes: notes || undefined,
      }).catch(e => console.error('[email] order confirmation:', e))
    }

    // WhatsApp confirmation (non-blocking)
    if (orderData.customer_phone) {
      sendWhatsAppOrderConfirmation(orderData.customer_phone, {
        restaurantName,
        orderNumber,
        customerName: orderData.customer_name,
        total,
        items: sanitizedItems.map((i: any) => ({ name: i.name, qty: i.qty })),
      }).catch(e => console.error('[whatsapp] order confirmation:', e))
    }

    if (adminEmail) {
      sendNewOrderNotification(adminEmail, {
        restaurantName,
        primaryColor,
        orderNumber,
        customerName: orderData.customer_name,
        total,
        deliveryType,
        items: sanitizedItems.map((i: any) => ({ name: i.name, qty: i.qty })),
      }).catch(e => console.error('[email] admin notification:', e))
    }

    return NextResponse.json({ orderId: order.id, orderNumber, displayNumber })
  } catch (err) {
    if (err instanceof Error && err.message === 'MENU_ITEM_NOT_AVAILABLE') {
      return NextResponse.json({ error: 'One or more products are not available' }, { status: 400 })
    }
    console.error('[orders POST] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
