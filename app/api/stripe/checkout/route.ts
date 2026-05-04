import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { checkRateLimit, getClientIp } from '@/lib/ratelimit'

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
    const { tenantId, items, customerInfo, deliveryType, deliveryAddress, notes } = body

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

    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_account_id, primary_domain, slug')
      .eq('id', tenantId)
      .single()

    if (!tenant?.stripe_account_id) {
      return NextResponse.json({ error: 'Pagos no configurados para este restaurante' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate, delivery_fee')
      .eq('tenant_id', tenantId)
      .single()

    const subtotal = items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0)
    const tax = settings?.tax_rate ? subtotal * (settings.tax_rate / 100) : 0
    const deliveryFee = deliveryType === 'delivery' ? (settings?.delivery_fee || 0) : 0
    const total = subtotal + tax + deliveryFee

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
        items,
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
      : `${process.env.NEXT_PUBLIC_APP_URL}/${tenantId}`

    // Create Stripe Checkout Session on the restaurant's account
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          ...items.map((item: any) => ({
            price_data: {
              currency: 'cop',
              product_data: { name: item.name },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.qty,
          })),
          ...(tax > 0 ? [{
            price_data: {
              currency: 'cop',
              product_data: { name: `Impuestos (${settings?.tax_rate}%)` },
              unit_amount: Math.round(tax * 100),
            },
            quantity: 1,
          }] : []),
          ...(deliveryFee > 0 ? [{
            price_data: {
              currency: 'cop',
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
