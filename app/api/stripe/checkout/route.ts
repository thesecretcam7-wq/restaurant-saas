import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { getCurrencyByCountry } from '@/lib/currency'
import { calculateOrderTotals } from '@/lib/order-totals'
import { canCreateOrder } from '@/lib/checkPlan'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

let checkoutLimiter: any = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const { Ratelimit } = require('@upstash/ratelimit') as typeof import('@upstash/ratelimit')
    const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis')
    checkoutLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(20, '1 m'),
    })
  } catch (err) {
    console.warn('Rate limiting not available for checkout:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request)
    if (checkoutLimiter) {
      const { allowed } = await checkRateLimit(checkoutLimiter, `checkout:${clientIp}`)
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many checkout attempts. Please try again in a minute.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    }

    const body = await request.json()
    const { tenantId: tenantParam, items, customerInfo, deliveryType, deliveryAddress, notes } = body

    if (!tenantParam) {
      return NextResponse.json({ error: 'Restaurante requerido' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const tenantLookup = String(tenantParam)
    const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantLookup)

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_account_id, primary_domain, slug, country')
      .eq(isTenantUUID ? 'id' : 'slug', tenantLookup)
      .single()

    if (!tenant?.stripe_account_id) {
      return NextResponse.json({ error: 'Pagos no configurados para este restaurante' }, { status: 400 })
    }

    const tenantId = tenant.id

    const orderAccess = await canCreateOrder(tenantId)
    if (!orderAccess.allowed) {
      return NextResponse.json({ error: orderAccess.reason || 'El restaurante no puede recibir pedidos en este momento' }, { status: 403 })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El pedido debe incluir productos' }, { status: 400 })
    }

    const itemIds = items
      .map((item: any) => item.menu_item_id || item.item_id || item.id)
      .filter(Boolean)

    if (itemIds.length !== items.length) {
      return NextResponse.json({ error: 'Todos los productos deben tener ID valido' }, { status: 400 })
    }

    const { data: menuRows, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, available')
      .eq('tenant_id', tenantId)
      .in('id', itemIds)

    if (menuError) {
      return NextResponse.json({ error: 'Error validando productos' }, { status: 500 })
    }

    const menuById = new Map((menuRows || []).map((item: any) => [item.id, item]))
    const sanitizedItemsRaw = items.map((item: any) => {
      const menuId = item.menu_item_id || item.item_id || item.id
      const menuItem = menuById.get(menuId)
      const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1))

      if (!menuItem || menuItem.available === false) {
        return null
      }

      return {
        menu_item_id: menuItem.id,
        name: menuItem.name,
        price: Number(menuItem.price) || 0,
        qty,
        notes: item.notes || null,
      }
    })

    if (sanitizedItemsRaw.some((item: any) => !item)) {
      return NextResponse.json({ error: 'Uno o mas productos no estan disponibles' }, { status: 400 })
    }

    const sanitizedItems = sanitizedItemsRaw.filter(Boolean) as Array<{
      menu_item_id: string
      name: string
      price: number
      qty: number
      notes: string | null
    }>

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee, delivery_min_order, delivery_enabled, country')
      .eq('tenant_id', tenantId)
      .single()

    const subtotal = sanitizedItems.reduce((sum: number, item: any) => sum + item.price * item.qty, 0)

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

    const totals = calculateOrderTotals({
      items: sanitizedItems,
      taxRate: settings?.tax_rate,
      deliveryType,
      deliveryFee: settings?.delivery_fee,
    })
    const tax = totals.tax
    const deliveryFee = totals.deliveryFee
    const total = totals.total
    const currencyInfo = getCurrencyByCountry(settings?.country || tenant.country || 'ES')
    const stripeCurrency = currencyInfo.code.toLowerCase()

    // Create order in DB first
    const orderNumber = `ORD-${Date.now()}`
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        items: sanitizedItems,
        subtotal,
        tax,
        delivery_fee: deliveryFee,
        total,
        payment_method: 'stripe',
        payment_status: 'pending',
        delivery_type: deliveryType,
        delivery_address: deliveryAddress || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
    }

    const domain = tenant.primary_domain
      ? `https://${tenant.primary_domain}`
      : `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/${tenant.slug || tenantId}`

    // Create Stripe Checkout Session on the restaurant's account
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          ...sanitizedItems.map((item: any) => ({
            price_data: {
              currency: stripeCurrency,
              product_data: { name: item.name },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.qty,
          })),
          ...(tax > 0 ? [{
            price_data: {
              currency: stripeCurrency,
              product_data: { name: `Impuestos (${settings?.tax_rate}%)` },
              unit_amount: Math.round(tax * 100),
            },
            quantity: 1,
          }] : []),
          ...(deliveryFee > 0 ? [{
            price_data: {
              currency: stripeCurrency,
              product_data: { name: 'Costo de envío' },
              unit_amount: Math.round(deliveryFee * 100),
            },
            quantity: 1,
          }] : []),
        ],
        success_url: `${domain}/gracias?order=${order.id}`,
        cancel_url: `${domain}/carrito`,
        customer_email: customerInfo.email,
        metadata: {
          tenant_id: tenantId,
          order_id: order.id,
        },
      },
      { stripeAccount: tenant.stripe_account_id }
    )

    // Save session ID on order
    await supabase
      .from('orders')
      .update({ stripe_payment_intent_id: session.payment_intent as string })
      .eq('id', order.id)

    return NextResponse.json({ url: session.url, orderId: order.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Error al crear checkout' }, { status: 500 })
  }
}
