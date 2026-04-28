import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params
    const { items, customerName, notes } = await request.json()

    if (!items?.length || !customerName?.trim()) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_account_id, slug')
      .eq('slug', domain)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    if (!tenant.stripe_account_id) {
      return NextResponse.json({ error: 'Pagos con tarjeta no configurados' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('tax_rate')
      .eq('tenant_id', tenant.id)
      .single()

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.qty, 0)
    const taxRate = settings?.tax_rate ?? 0
    const tax = taxRate ? subtotal * (taxRate / 100) : 0
    const total = subtotal + tax

    // Daily sequential display number
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', todayStart.toISOString())
    const displayNumber = (todayCount ?? 0) + 1

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenant.id,
        order_number: `ORD-${Date.now()}`,
        customer_name: customerName.trim(),
        customer_phone: null,
        items,
        subtotal,
        tax,
        delivery_fee: 0,
        total,
        payment_method: 'stripe',
        payment_status: 'pending',
        delivery_type: 'pickup',
        notes: notes?.trim() || null,
        status: 'pending',
        display_number: displayNumber,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('[kiosko/stripe] order insert error:', orderError)
      return NextResponse.json({ error: 'Error al crear el pedido' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://eccofood.vercel.app'
    const base = origin.endsWith('/') ? origin.slice(0, -1) : origin
    const successUrl = `${base}/${domain}/kiosko?confirmado=true&num=${displayNumber}&name=${encodeURIComponent(customerName.trim())}`
    const cancelUrl = `${base}/${domain}/kiosko`

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
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
          ...(tax > 0
            ? [{
                price_data: {
                  currency: 'cop',
                  product_data: { name: `Impuestos (${taxRate}%)` },
                  unit_amount: Math.round(tax * 100),
                },
                quantity: 1,
              }]
            : []),
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { tenant_id: tenant.id, order_id: order.id },
      },
      { stripeAccount: tenant.stripe_account_id }
    )

    return NextResponse.json({ url: session.url, displayNumber })
  } catch (err) {
    console.error('[kiosko/stripe] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
