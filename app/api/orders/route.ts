import { createServiceClient } from '@/lib/supabase/server'
import { canCreateOrder } from '@/lib/checkPlan'
import { after, NextRequest, NextResponse } from 'next/server'
import { verifyCSRFToken, sendCSRFErrorResponse } from '@/lib/csrf'
import { sendOrderConfirmation, sendNewOrderNotification } from '@/lib/email'
import { sendWhatsAppOrderConfirmation } from '@/lib/whatsapp'
import { orderLimiter, checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { calculateOrderTotals } from '@/lib/order-totals'
import { syncCustomerFromOrder } from '@/lib/customer-sync'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time'
import { buildOrderItemRows } from '@/lib/order-item-routing'
import { sendServiceReadyPushNotifications } from '@/lib/push-server'

function normalizePaymentMethodValue(method: unknown) {
  if (typeof method !== 'string') return null
  const value = method.trim().toLowerCase()
  if (value === 'tarjeta' || value === 'card') return 'stripe'
  if (['cash', 'stripe', 'wompi', 'mixed'].includes(value)) return value
  return null
}

function normalizePaymentBreakdown(value: unknown, orderTotal: number, paymentMethod: string | null) {
  const total = Math.max(0, Number(orderTotal) || 0)
  const rows = Array.isArray(value) ? value : []
  const payments = rows
    .map((payment: any) => ({
      method: normalizePaymentMethodValue(payment?.method),
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

function parseOperationalCloseMinutes(value?: string | null) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return 5 * 60
  const [hours, minutes] = value.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 5 * 60
  return hours * 60 + minutes
}

function getPreviousOpenPeriodCreatedAt(periodStart: string, operationalCloseTime?: string | null) {
  const closeMinutes = parseOperationalCloseMinutes(operationalCloseTime)
  const previousBusinessDateTime = new Date(periodStart)
  previousBusinessDateTime.setUTCMinutes(previousBusinessDateTime.getUTCMinutes() - closeMinutes - 60)
  return previousBusinessDateTime.toISOString()
}

async function hasPendingPreviousCashClosing(supabase: ReturnType<typeof createServiceClient>, tenantId: string, currentPeriodStart: string) {
  const [ordersRes, closedItemsRes, latestClosingRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at')
      .eq('tenant_id', tenantId)
      .lt('created_at', currentPeriodStart)
      .not('payment_method', 'is', null)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true })
      .limit(1000),
    supabase
      .from('cash_closing_items')
      .select('order_id')
      .eq('tenant_id', tenantId)
      .not('order_id', 'is', null)
      .limit(2000),
    supabase
      .from('cash_closings')
      .select('closed_at')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (ordersRes.error) throw ordersRes.error

  const closedOrderIds = new Set((closedItemsRes.error ? [] : closedItemsRes.data || []).map((item: any) => item.order_id))
  const latestClosingDate = !latestClosingRes.error && latestClosingRes.data?.closed_at
    ? new Date(latestClosingRes.data.closed_at)
    : null

  const cancelledStatuses = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'])
  return (ordersRes.data || []).some((order: any) => {
    if (cancelledStatuses.has(String(order?.status || '').trim().toLowerCase())) return false
    if (closedOrderIds.has(order.id)) return false
    if (latestClosingDate && new Date(order.created_at) <= latestClosingDate) return false
    return true
  })
}

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
    const { tenantId: tenantParam, tenantSlug, items, customerInfo, deliveryType, deliveryAddress, notes, paymentMethod, paymentBreakdown, tableNumber, tableId, tableQrCode, waiterName, amountPaid, source, deliveryFee: requestedDeliveryFee, deliveryZoneId, businessDateMode, skipOrderItems, offlineClientId } = body

    if (!tenantParam) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // SECURITY: Validate that tenantId/slug corresponds to an active restaurant.
    // Some public/staff screens can carry stale cached params, so try the explicit
    // UUID, the slug and finally the first segment from the referring URL.
    const referer = request.headers.get('referer') || request.headers.get('origin') || ''
    let refererSlug = ''
    try {
      const parsed = new URL(referer)
      refererSlug = parsed.pathname.split('/').filter(Boolean)[0] || ''
    } catch {}

    const tenantCandidates = Array.from(new Set(
      [tenantParam, tenantSlug, refererSlug]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    ))

    let tenant: { id: string } | null = null
    let tenantError: any = null
    for (const candidate of tenantCandidates) {
      const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)
      const result = await supabase
        .from('tenants')
        .select('id')
        .eq(isTenantUUID ? 'id' : 'slug', candidate)
        .maybeSingle()

      tenantError = result.error
      if (result.data?.id) {
        tenant = result.data
        break
      }
    }

    if (tenantError || !tenant) {
      console.warn('[orders POST] invalid restaurant', {
        tenantParam,
        tenantSlug,
        refererSlug,
        tenantCandidates,
        tenantError: tenantError?.message,
      })
      return NextResponse.json({ error: 'Restaurante invalido. Actualiza la pagina e intenta de nuevo.' }, { status: 400 })
    }

    const tenantId = tenant.id
    let normalizedCustomerInfo = customerInfo || {}
    let normalizedDeliveryType = deliveryType
    let normalizedDeliveryAddress = deliveryAddress || null
    let normalizedPaymentMethod = normalizePaymentMethodValue(paymentMethod)
    let normalizedTableNumber = tableNumber || null
    let normalizedWaiterName = waiterName || null
    let normalizedNotes = notes || null
    let tableQrCodeToConsume: string | null = null

    const protectedSourceRoles: Record<string, string[]> = {
      pos: ['admin', 'cajero'],
      'pos-offline': ['admin', 'cajero'],
      comandero: ['admin', 'camarero'],
      kiosk: ['admin', 'cajero', 'camarero', 'cocinero'],
    }
    if (source && protectedSourceRoles[source]) {
      await requireTenantAccess(tenantId, { staffRoles: protectedSourceRoles[source] })
    }

    if (source === 'table-qr') {
      const qrCodeValue = String(tableQrCode || '').trim()

      if (!qrCodeValue) {
        return NextResponse.json({ error: 'Codigo QR de mesa requerido.' }, { status: 400 })
      }

      const { data: qrCode, error: qrError } = await supabase
        .from('table_qr_codes')
        .select('table_id, tables!inner(id, table_number, status)')
        .eq('tenant_id', tenantId)
        .eq('unique_code', qrCodeValue)
        .eq('is_active', true)
        .maybeSingle()

      if (qrError) {
        console.error('[orders POST] table QR validation error:', qrError.message)
        return NextResponse.json({ error: 'Error validando el QR de la mesa.' }, { status: 500 })
      }

      const qrTable = Array.isArray((qrCode as any)?.tables)
        ? (qrCode as any).tables[0]
        : (qrCode as any)?.tables

      if (!qrCode || !qrTable) {
        return NextResponse.json({ error: 'Codigo QR de mesa invalido.' }, { status: 403 })
      }

      if (tableId && qrCode.table_id !== tableId) {
        return NextResponse.json({ error: 'El QR no corresponde a esta mesa.' }, { status: 403 })
      }

      if (qrTable.status === 'maintenance') {
        return NextResponse.json({ error: 'Esta mesa no esta disponible para pedidos.' }, { status: 400 })
      }

      tableQrCodeToConsume = qrCodeValue
      normalizedDeliveryType = 'dine-in'
      normalizedDeliveryAddress = null
      normalizedPaymentMethod = null
      normalizedTableNumber = qrTable.table_number
      normalizedWaiterName = 'QR mesa'
      normalizedCustomerInfo = {
        name: normalizedCustomerInfo.name || `Mesa ${qrTable.table_number}`,
        phone: normalizedCustomerInfo.phone || null,
        email: normalizedCustomerInfo.email || null,
      }
      normalizedNotes = [
        normalizedNotes,
        `Pedido realizado por QR de Mesa ${qrTable.table_number}`,
      ].filter(Boolean).join(' | ') || null
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must include items' }, { status: 400 })
    }

    const canUseManualItems = ['pos', 'pos-offline'].includes(String(source || ''))
    const itemIds = items
      .filter((item: any) => !(canUseManualItems && item.is_manual === true))
      .map((item: any) => item.menu_item_id || item.item_id || item.id)
      .filter(Boolean)

    const missingCatalogItem = items.some((item: any) => {
      if (canUseManualItems && item.is_manual === true) return false
      return !(item.menu_item_id || item.item_id || item.id)
    })
    if (missingCatalogItem) {
      return NextResponse.json({ error: 'Every item must include a menu item id' }, { status: 400 })
    }

    const { data: menuRows, error: menuError } = itemIds.length > 0
      ? await supabase
          .from('menu_items')
          .select('id, name, price, available, variants')
          .eq('tenant_id', tenantId)
          .in('id', itemIds)
      : { data: [], error: null }

    if (menuError) {
      console.error('[orders POST] menu validation error:', menuError.message)
      return NextResponse.json({ error: 'Error validating menu items' }, { status: 500 })
    }

    const menuById = new Map((menuRows || []).map((item: any) => [item.id, item]))
    const sanitizedItems = items.map((item: any) => {
      if (canUseManualItems && item.is_manual === true) {
        const manualName = String(item.name || '').trim()
        const manualPrice = Number(item.price)
        const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))

        if (!manualName || !Number.isFinite(manualPrice) || manualPrice <= 0) {
          throw new Error('INVALID_MANUAL_ITEM')
        }

        return {
          menu_item_id: null,
          name: manualName,
          price: manualPrice,
          qty,
          notes: item.notes || 'Articulo manual',
          is_manual: true,
          requires_kitchen: false,
        }
      }

      const menuId = item.menu_item_id || item.item_id || item.id
      const menuItem = menuById.get(menuId)
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))

      if (!menuItem || menuItem.available === false) {
        throw new Error('MENU_ITEM_NOT_AVAILABLE')
      }

      const basePrice = Number(menuItem.price) || 0
      const submittedPrice = Number(item.price)

      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number.isFinite(submittedPrice) ? Math.max(basePrice, submittedPrice) : basePrice,
        qty,
        notes: item.notes || null,
        requires_kitchen: menuItem.variants?.requires_kitchen !== false,
      }
    })

    // Plan limit: check monthly order count
    const orderCheck = await canCreateOrder(tenantId)
    if (!orderCheck.allowed) {
      return NextResponse.json({ error: orderCheck.reason, limitReached: true, used: orderCheck.used, limit: orderCheck.limit }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee, delivery_zones, delivery_min_order, delivery_enabled, cash_payment_enabled, kds_enabled, operating_hours, timezone, country')
      .eq('tenant_id', tenantId)
      .single()

    const registeringPreviousOpenPeriod = businessDateMode === 'previous_open_period'
    let previousOpenPeriodCreatedAt: string | null = null

    if (businessDateMode && !registeringPreviousOpenPeriod) {
      return NextResponse.json({ error: 'Modo de fecha no permitido.' }, { status: 400 })
    }

    if (registeringPreviousOpenPeriod) {
      if (source !== 'pos') {
        return NextResponse.json({ error: 'Solo el TPV puede registrar ventas en turno anterior.' }, { status: 403 })
      }

      const timeZone = getRestaurantTimeZone({
        timezone: settings?.timezone,
        settingsCountry: settings?.country,
      })
      const locale = getRestaurantLocale(settings?.country)
      const currentPeriod = getRestaurantBusinessPeriod({
        operatingHours: settings?.operating_hours,
        timeZone,
        locale,
      })
      const previousClosingStillOpen = await hasPendingPreviousCashClosing(supabase, tenantId, currentPeriod.periodStart)

      if (!previousClosingStillOpen) {
        return NextResponse.json(
          { error: 'No hay una caja anterior pendiente. No se puede registrar la venta en el dia anterior.' },
          { status: 400 }
        )
      }

      previousOpenPeriodCreatedAt = getPreviousOpenPeriodCreatedAt(
        currentPeriod.periodStart,
        currentPeriod.operationalCloseTime
      )
    }

    const subtotal = sanitizedItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0)
    const deliveryZones = Array.isArray(settings?.delivery_zones) ? settings.delivery_zones : []
    const selectedDeliveryZone = deliveryZoneId
      ? deliveryZones.find((zone: any) => String(zone.id) === String(deliveryZoneId))
      : null
    const submittedDeliveryFee = Number(requestedDeliveryFee)
    const allowedDeliveryFees = [
      Number(settings?.delivery_fee || 0),
      ...deliveryZones.map((zone: any) => Number(zone.fee || 0)),
    ]
    const canUseSubmittedDeliveryFee =
      ['pos', 'pos-offline'].includes(String(source || '')) &&
      Number.isFinite(submittedDeliveryFee) &&
      allowedDeliveryFees.some((fee) => Math.abs(fee - submittedDeliveryFee) < 0.01)
    const deliveryFeeForTotals = normalizedDeliveryType === 'delivery'
      ? selectedDeliveryZone
        ? Number(selectedDeliveryZone.fee || 0)
        : canUseSubmittedDeliveryFee
          ? submittedDeliveryFee
          : Number(settings?.delivery_fee || 0)
      : 0

    if (source === 'store' && normalizedPaymentMethod === 'cash' && settings?.cash_payment_enabled === false) {
      return NextResponse.json({ error: 'Pago en efectivo no esta habilitado para este restaurante' }, { status: 400 })
    }

    if (normalizedDeliveryType === 'delivery') {
      if (settings?.delivery_enabled === false) {
        return NextResponse.json({ error: 'Delivery no esta habilitado para este restaurante' }, { status: 400 })
      }

      const minOrder = Number(selectedDeliveryZone?.min_order || settings?.delivery_min_order || 0)
      if (minOrder > 0 && subtotal < minOrder) {
        return NextResponse.json(
          { error: `El pedido minimo para delivery es ${minOrder}` },
          { status: 400 }
        )
      }
    }

    const totals = calculateOrderTotals({
      items: sanitizedItems,
      taxRate: settings?.tax_rate,
      country: settings?.country,
      deliveryType: normalizedDeliveryType,
      deliveryFee: deliveryFeeForTotals,
    })
    const tax = totals.tax
    const deliveryFee = totals.deliveryFee
    const total = totals.total
    const normalizedPaymentBreakdown = normalizePaymentBreakdown(paymentBreakdown, total, normalizedPaymentMethod)

    if (normalizedPaymentMethod === 'mixed' && !normalizedPaymentBreakdown) {
      return NextResponse.json({ error: 'El pago mixto debe incluir efectivo y tarjeta por el total exacto.' }, { status: 400 })
    }

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

    const safeOfflineClientId = source === 'pos-offline' && typeof offlineClientId === 'string'
      ? offlineClientId.trim().slice(0, 80)
      : ''

    const orderNotes = [
      normalizedNotes || null,
      safeOfflineClientId ? `ID offline ${safeOfflineClientId}` : null,
      registeringPreviousOpenPeriod ? 'Venta registrada manualmente en turno anterior desde TPV' : null,
    ].filter(Boolean).join(' | ') || null

    const isImmediatePaidPOSOrder = (source === 'pos' || source === 'pos-offline') && Boolean(normalizedPaymentMethod)

    if (safeOfflineClientId) {
      const { data: existingOfflineOrder, error: existingOfflineError } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('tenant_id', tenantId)
        .ilike('notes', `%ID offline ${safeOfflineClientId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingOfflineError) {
        console.error('[orders POST] offline idempotency lookup error:', existingOfflineError.message)
      } else if (existingOfflineOrder?.id) {
        return NextResponse.json({
          success: true,
          orderId: existingOfflineOrder.id,
          orderNumber: existingOfflineOrder.order_number,
          reused: true,
        })
      }
    }

    const orderData: any = {
      tenant_id: tenantId,
      order_number: orderNumber,
      customer_name: normalizedCustomerInfo.name,
      customer_email: normalizedCustomerInfo.email || null,
      customer_phone: normalizedCustomerInfo.phone || null,
      items: sanitizedItems,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      payment_method: normalizedPaymentMethod,
      payment_breakdown: normalizedPaymentBreakdown,
      payment_status: isImmediatePaidPOSOrder ? 'paid' : 'pending',
      delivery_type: normalizedDeliveryType,
      delivery_address: normalizedDeliveryAddress,
      table_number: normalizedTableNumber,
      waiter_name: normalizedWaiterName,
      notes: orderNotes,
      status: isImmediatePaidPOSOrder ? 'confirmed' : 'pending',
      display_number: displayNumber,
    }

    if (previousOpenPeriodCreatedAt) {
      orderData.created_at = previousOpenPeriodCreatedAt
      orderData.updated_at = previousOpenPeriodCreatedAt
    }

    if (tableQrCodeToConsume) {
      const { data: consumedQr, error: consumeQrError } = await supabase
        .from('table_qr_codes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('unique_code', tableQrCodeToConsume)
        .eq('is_active', true)
        .select('id')
        .maybeSingle()

      if (consumeQrError) {
        console.error('[orders POST] table QR consume error:', consumeQrError.message)
        return NextResponse.json({ error: 'No se pudo cerrar el QR de la mesa. Intenta de nuevo.' }, { status: 500 })
      }

      if (!consumedQr) {
        return NextResponse.json({ error: 'Este QR ya fue usado. Pide al camarero un QR nuevo.' }, { status: 409 })
      }
    }

    const insertOrder = (payload: Record<string, any>) => supabase
      .from('orders')
      .insert(payload)
      .select()
      .single()

    let insertResult = await insertOrder(orderData)
    if (insertResult.error && isMissingPaymentBreakdownColumn(insertResult.error)) {
      const fallbackOrderData = { ...orderData }
      delete fallbackOrderData.payment_breakdown
      insertResult = await insertOrder(fallbackOrderData)
    }

    const { data: order, error } = insertResult

    if (error) {
      console.error('[orders POST] insert error:', error.message, error.details, error.hint)
      if (tableQrCodeToConsume) {
        await supabase
          .from('table_qr_codes')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('unique_code', tableQrCodeToConsume)
          .then(undefined, (reactivateError) => {
            console.error('[orders POST] table QR reactivate error:', reactivateError)
          })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    after(async () => {
      try {
        if (source === 'store') {
          await syncCustomerFromOrder(supabase, {
            tenantId,
            name: orderData.customer_name,
            email: orderData.customer_email,
            phone: orderData.customer_phone,
            address: normalizedDeliveryAddress,
            total,
          })
        }

        // Auto-create order_items after the response so POS checkout is not blocked.
        // Exception: kiosk cash orders skip this - items are created when cashier confirms payment.
        const isKioskCash = source === 'kiosk' && paymentMethod === 'cash'
        const kdsEnabled = settings?.kds_enabled === true
        const shouldSkipOrderItems = source === 'pos' && skipOrderItems === true
        const orderItemsData = buildOrderItemRows({
          orderId: order.id,
          tenantId,
          items: sanitizedItems,
          includeKitchenItems: kdsEnabled,
        })

        if (!isKioskCash && !registeringPreviousOpenPeriod && !shouldSkipOrderItems && orderItemsData.length > 0) {
          const { data: insertedOrderItems, error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData)
            .select('id, status, requires_kitchen')

          if (itemsError) {
            console.error('Error creating order_items for routing:', itemsError.message)
          } else if (normalizedDeliveryType === 'dine-in') {
            const directReadyItemIds = (insertedOrderItems || [])
              .filter((item: { id?: string; status?: string; requires_kitchen?: boolean }) =>
                item.id && item.status === 'ready' && item.requires_kitchen === false
              )
              .map((item: { id: string }) => item.id)

            if (directReadyItemIds.length > 0) {
              await sendServiceReadyPushNotifications(supabase, { tenantId, itemIds: directReadyItemIds })
            }
          }
        }

        if (source !== 'pos') {
          const [{ data: branding }, { data: tenantRow }, { data: settings2 }] = await Promise.all([
            supabase
              .from('tenant_branding')
              .select('app_name, primary_color')
              .eq('tenant_id', tenantId)
              .maybeSingle(),
            supabase
              .from('tenants')
              .select('organization_name, owner_email')
              .eq('id', tenantId)
              .maybeSingle(),
            supabase
              .from('restaurant_settings')
              .select('email')
              .eq('tenant_id', tenantId)
              .maybeSingle(),
          ])

          const palette = deriveBrandPalette()
          const restaurantName = branding?.app_name || tenantRow?.organization_name || 'Restaurante'
          const primaryColor = palette.buttonPrimary
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
              deliveryType: normalizedDeliveryType,
              deliveryAddress: normalizedDeliveryAddress || undefined,
              paymentMethod: normalizedPaymentMethod || '',
              notes: orderNotes || undefined,
            }).catch(e => console.error('[email] order confirmation:', e))
          }

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
              deliveryType: normalizedDeliveryType,
              items: sanitizedItems.map((i: any) => ({ name: i.name, qty: i.qty })),
            }).catch(e => console.error('[email] admin notification:', e))
          }
        }
      } catch (postOrderError) {
        console.error('[orders POST] post-response work failed:', postOrderError)
      }
    })

    return NextResponse.json({ orderId: order.id, orderNumber, displayNumber })
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_MANUAL_ITEM') {
      return NextResponse.json(
        { error: 'El articulo manual necesita nombre y valor mayor que cero.' },
        { status: 400 }
      )
    }
    if (err instanceof Error && err.message === 'MENU_ITEM_NOT_AVAILABLE') {
      return NextResponse.json(
        {
          error: 'Uno o mas productos ya no estan disponibles. Vuelve a agregarlos al carrito.',
          clearCart: true,
        },
        { status: 400 }
      )
    }
    if (err instanceof Error && ['Unauthorized', 'Forbidden'].includes(err.message)) {
      return tenantAuthErrorResponse(err)
    }
    console.error('[orders POST] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
