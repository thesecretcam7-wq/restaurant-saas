import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, orderLimiter } from '@/lib/ratelimit'
import { calculateOrderTotals } from '@/lib/order-totals'
import { canCreateOrder } from '@/lib/checkPlan'
import { syncCustomerFromOrder } from '@/lib/customer-sync'
import { createWompiIntegritySignature, getWompiCheckoutUrl } from '@/lib/wompi'
import { decryptServerSecret } from '@/lib/server-secret-box'
import { getPaymentConfig, selectSettingsWithPaymentFallback } from '@/lib/payment-settings'

function buildWompiCustomerEmail(customerInfo: any, orderNumber: string) {
  const email = String(customerInfo?.email || '').trim()
  if (email) return email

  const phoneDigits = String(customerInfo?.phone || '').replace(/\D/g, '')
  const suffix = phoneDigits || orderNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `cliente-${suffix}@eccofoodapp.com`
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await checkRateLimit(orderLimiter, `wompi:${ip}`)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta de nuevo en un momento.' }, { status: 429 })
    }

    const body = await request.json()
    const { tenantId: tenantParam, tenantSlug, items, customerInfo, deliveryType, deliveryAddress, notes } = body

    if ((!tenantParam && !tenantSlug) || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos del pedido' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenantCandidates = Array.from(new Set([
      tenantParam,
      tenantSlug,
      request.headers.get('referer') ? new URL(request.headers.get('referer') as string).pathname.split('/').filter(Boolean)[0] : '',
    ].map(value => String(value || '').trim()).filter(Boolean)))

    let tenantResult: any = { data: null, error: null }
    for (const tenantLookup of tenantCandidates) {
      const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantLookup)
      tenantResult = await supabase
        .from('tenants')
        .select('id, slug, primary_domain, country')
        .eq(isTenantUUID ? 'id' : 'slug', tenantLookup)
        .maybeSingle()
      if (tenantResult.error?.code === '42703' || String(tenantResult.error?.message || '').includes('primary_domain')) {
        tenantResult = await supabase
          .from('tenants')
          .select('id, slug, country')
          .eq(isTenantUUID ? 'id' : 'slug', tenantLookup)
          .maybeSingle()
      }

      if (tenantResult.data?.id || tenantResult.error) break
    }

    const { data: tenant, error: tenantError } = tenantResult

    if (tenantError) {
      console.error('[wompi/checkout] tenant lookup error:', tenantError)
      return NextResponse.json({ error: 'No pude leer el restaurante' }, { status: 500 })
    }
    if (!tenant?.id) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    const { data: settingsRow, error: settingsError } = await selectSettingsWithPaymentFallback(
      supabase,
      tenant.id,
      'tax_rate, delivery_fee, delivery_min_order, delivery_enabled, country, printer_settings, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_private_key, wompi_integrity_key',
      'tax_rate, delivery_fee, delivery_min_order, delivery_enabled, country, printer_settings'
    )

    if (settingsError) {
      console.error('[wompi/checkout] settings error:', settingsError)
      return NextResponse.json({ error: 'No pude leer la configuracion de pagos' }, { status: 500 })
    }

    const paymentConfig = getPaymentConfig(settingsRow, tenant.country || 'ES')
    const settings = { ...settingsRow, ...paymentConfig }
    const country = String(settings.country || tenant.country || 'ES').toUpperCase()
    if (country !== 'CO') {
      return NextResponse.json({ error: 'Wompi solo esta disponible para restaurantes de Colombia' }, { status: 400 })
    }
    if (settings?.online_payment_provider !== 'wompi' || !settings?.wompi_enabled || !settings?.wompi_public_key || !settings?.wompi_private_key || !settings?.wompi_integrity_key) {
      return NextResponse.json({ error: 'Wompi no esta configurado para este restaurante' }, { status: 400 })
    }

    const phoneDigits = String(customerInfo?.phone || '').replace(/\D/g, '')

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
    const customerEmail = buildWompiCustomerEmail(customerInfo, orderNumber)
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
      if (orderError?.code === '23514' && String(orderError.message || '').includes('orders_payment_method_check')) {
        return NextResponse.json({ error: 'Falta actualizar la base de datos para aceptar pagos Wompi' }, { status: 500 })
      }
      return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
    }

    await syncCustomerFromOrder(supabase, {
      tenantId: tenant.id,
      name: customerInfo?.name,
      email: customerInfo?.email || null,
      phone: customerInfo?.phone,
      address: deliveryAddress,
      total: totals.total,
    })

    const primaryDomain = (tenant as any).primary_domain
    const domain = primaryDomain
      ? `https://${primaryDomain}`
      : `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/${tenant.slug || tenantSlug || tenant.id}`
    const amountInCents = Math.round(Number(totals.total || 0) * 100)
    const currency = 'COP'
    const wompiPrivateKey = decryptServerSecret(settings.wompi_private_key)
    const wompiIntegrityKey = decryptServerSecret(settings.wompi_integrity_key)

    if (!wompiPrivateKey || !wompiIntegrityKey) {
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: 'Las llaves privadas de Wompi no se pudieron leer. En Administrador > Wompi pega de nuevo la llave privada y la llave de integridad, guarda y prueba otra vez.' }, { status: 500 })
    }

    const signature = createWompiIntegritySignature({
      reference: orderNumber,
      amountInCents,
      currency,
      integrityKey: wompiIntegrityKey,
    })

    const url = new URL(getWompiCheckoutUrl())
    url.searchParams.set('public-key', settings.wompi_public_key)
    url.searchParams.set('currency', currency)
    url.searchParams.set('amount-in-cents', String(amountInCents))
    url.searchParams.set('reference', orderNumber)
    url.searchParams.set('integrity', signature)
    url.searchParams.set('signature:integrity', signature)
    url.searchParams.set('redirect-url', `${domain}/gracias?order=${order.id}&provider=wompi&reference=${encodeURIComponent(orderNumber)}`)
    url.searchParams.set('customer-data:email', customerEmail)
    if (customerInfo?.name) url.searchParams.set('customer-data:full-name', customerInfo.name)
    if (phoneDigits) {
      url.searchParams.set('customer-data:phone-number', phoneDigits)
      url.searchParams.set('customer-data:phone-number-prefix', '+57')
    }

    return NextResponse.json({ url: url.toString(), orderId: order.id, orderNumber })
  } catch (error) {
    console.error('[wompi/checkout] error:', error)
    return NextResponse.json({ error: 'Error al crear pago con Wompi' }, { status: 500 })
  }
}
