import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, orderLimiter } from '@/lib/ratelimit'
import { calculateOrderTotals } from '@/lib/order-totals'
import { canCreateOrder } from '@/lib/checkPlan'
import { syncCustomerFromOrder } from '@/lib/customer-sync'
import { createWompiIntegritySignature, getWompiCheckoutUrl } from '@/lib/wompi'
import { decryptServerSecret } from '@/lib/server-secret-box'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await checkRateLimit(orderLimiter, `wompi:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta de nuevo en un momento.' }, { status: 429 })
    }

    const body = await request.json()
    const { tenantId: tenantParam, tenantSlug, items, customerInfo, deliveryType, deliveryAddress, notes } = body

    if (!tenantParam || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos del pedido' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenantLookup = String(tenantParam)
    const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantLookup)

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, primary_domain, country')
      .eq(isTenantUUID ? 'id' : 'slug', tenantLookup)
      .maybeSingle()

    if (!tenant?.id) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee, delivery_min_order, delivery_enabled, country, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_integrity_key')
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const country = String(settings?.country || tenant.country || 'ES').toUpperCase()
    if (country !== 'CO') {
      return NextResponse.json({ error: 'Wompi solo esta disponible para restaurantes de Colombia' }, { status: 400 })
    }
    if (settings?.online_payment_provider !== 'wompi' || !settings?.wompi_enabled || !settings?.wompi_public_key || !settings?.wompi_integrity_key) {
      return NextResponse.json({ error: 'Wompi no esta configurado para este restaurante' }, { status: 400 })
    }

    const orderAccess = await canCreateOrder(tenant.id)
    if (!orderAccess.allowed) {
      return NextResponse.json({ error: orderAccess.reason || 'El restaurante no puede recibir pedidos en este momento' }, { status: 403 })
    }

    const itemIds = items.map((item: any) => item.menu_item_id || item.item_id || item.id).filter(Boolean)
    if (itemIds.length !== items.length) {
      return NextResponse.json({ error: 'Todos los productos deben tener ID valido' }, { status: 400 })
    }

    const { data: menuRows, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, available')
      .eq('tenant_id', tenant.id)
      .in('id', itemIds)

    if (menuError) return NextResponse.json({ error: 'Error validando productos' }, { status: 500 })

    const menuById = new Map((menuRows || []).map((item: any) => [item.id, item]))
    const sanitizedItems = items.map((item: any) => {
      const menuId = item.menu_item_id || item.item_id || item.id
      const menuItem = menuById.get(menuId)
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))
      if (!menuItem || menuItem.available === false) return null
      const submittedPrice = Number(item.price)
      const basePrice = Number(menuItem.price) || 0
      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number.isFinite(submittedPrice) ? Math.max(basePrice, submittedPrice) : basePrice,
        qty,
        notes: item.notes || null,
      }
    })

    if (sanitizedItems.some(item => !item)) {
      return NextResponse.json({ error: 'Uno o mas productos no estan disponibles' }, { status: 400 })
    }

    const orderItems = sanitizedItems.filter(Boolean) as Array<{ menu_item_id: string; name: string; price: number; qty: number; notes: string | null }>
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0)

    if (deliveryType === 'delivery') {
      if (settings?.delivery_enabled === false) {
        return NextResponse.json({ error: 'Delivery no esta habilitado para este restaurante' }, { status: 400 })
      }
      const minOrder = Number(settings?.delivery_min_order || 0)
      if (minOrder > 0 && subtotal < minOrder) {
        return NextResponse.json({ error: `El pedido minimo para delivery es ${minOrder}` }, { status: 400 })
      }
    }

    const totals = calculateOrderTotals({
      items: orderItems,
      taxRate: settings?.tax_rate,
      deliveryType,
      deliveryFee: settings?.delivery_fee,
    })

    const orderNumber = `ORD-${Date.now()}`
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', todayStart.toISOString())
    const displayNumber = (todayCount ?? 0) + 1

    const orderPayload = {
        tenant_id: tenant.id,
        order_number: orderNumber,
        wompi_reference: orderNumber,
        customer_name: customerInfo?.name,
        customer_email: customerInfo?.email || null,
        customer_phone: customerInfo?.phone,
        items: orderItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        delivery_fee: totals.deliveryFee,
        total: totals.total,
        payment_method: 'wompi',
        payment_status: 'pending',
        delivery_type: deliveryType,
        delivery_address: deliveryAddress || null,
        notes: notes || null,
        status: 'pending',
        display_number: displayNumber,
      }

    let insertResult = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single()

    if (insertResult.error?.message?.includes('wompi_reference')) {
      const { wompi_reference, ...fallbackOrderPayload } = orderPayload
      insertResult = await supabase
        .from('orders')
        .insert(fallbackOrderPayload)
        .select('id')
        .single()
    }

    const { data: order, error: orderError } = insertResult

    if (orderError || !order) {
      console.error('[wompi/checkout] order insert error:', orderError)
      return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
    }

    await syncCustomerFromOrder(supabase, {
      tenantId: tenant.id,
      name: customerInfo?.name,
      email: customerInfo?.email,
      phone: customerInfo?.phone,
      address: deliveryAddress,
      total: totals.total,
    })

    const domain = tenant.primary_domain
      ? `https://${tenant.primary_domain}`
      : `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/${tenant.slug || tenantSlug || tenant.id}`
    const amountInCents = Math.round(Number(totals.total || 0) * 100)
    const currency = 'COP'
    const signature = createWompiIntegritySignature({
      reference: orderNumber,
      amountInCents,
      currency,
      integrityKey: decryptServerSecret(settings.wompi_integrity_key),
    })

    const url = new URL(getWompiCheckoutUrl())
    url.searchParams.set('public-key', settings.wompi_public_key)
    url.searchParams.set('currency', currency)
    url.searchParams.set('amount-in-cents', String(amountInCents))
    url.searchParams.set('reference', orderNumber)
    url.searchParams.set('signature:integrity', signature)
    url.searchParams.set('redirect-url', `${domain}/gracias?order=${order.id}&provider=wompi&reference=${encodeURIComponent(orderNumber)}`)
    if (customerInfo?.email) url.searchParams.set('customer-data:email', customerInfo.email)
    if (customerInfo?.name) url.searchParams.set('customer-data:full-name', customerInfo.name)
    if (customerInfo?.phone) {
      url.searchParams.set('customer-data:phone-number', String(customerInfo.phone).replace(/\D/g, ''))
      url.searchParams.set('customer-data:legal-id-type', 'CC')
    }

    return NextResponse.json({ url: url.toString(), orderId: order.id, orderNumber })
  } catch (error) {
    console.error('[wompi/checkout] error:', error)
    return NextResponse.json({ error: 'Error al crear pago con Wompi' }, { status: 500 })
  }
}
