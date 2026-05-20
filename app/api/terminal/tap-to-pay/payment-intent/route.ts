import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import {
  assertTerminalReady,
  getStripe,
  getTenantCurrency,
  resolveTerminalTenant,
  toStripeMinorUnitAmount,
} from '@/lib/terminal-payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tenantId = String(body.tenantId || '').trim()
    const orderId = String(body.orderId || '').trim()

    if (!tenantId || !orderId) {
      return NextResponse.json({ error: 'Restaurante y pedido requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenant = await resolveTerminalTenant(supabase, tenantId)
    await requireTenantAccess(tenant.id, { staffRoles: ['admin', 'cajero', 'camarero'] })
    assertTerminalReady(tenant)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, tenant_id, order_number, total, payment_status, stripe_payment_intent_id')
      .eq('id', orderId)
      .eq('tenant_id', tenant.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Este pedido ya esta pagado' }, { status: 409 })
    }

    const total = Number(order.total || 0)
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'El total del pedido no es valido' }, { status: 400 })
    }

    const stripe = getStripe()
    const currencyInfo = await getTenantCurrency(supabase, tenant)
    const currency = currencyInfo.code.toLowerCase()
    const amount = toStripeMinorUnitAmount(total, currencyInfo.code)

    if (order.stripe_payment_intent_id) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id,
        {},
        { stripeAccount: tenant.stripe_account_id! }
      )
      const canReuse = !['canceled', 'succeeded'].includes(existingIntent.status)
        && existingIntent.amount === amount
        && existingIntent.currency === currency

      if (canReuse) {
        return NextResponse.json({
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          amount,
          currency,
        })
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        description: `Eccofood ${tenant.organization_name || tenant.slug} ${order.order_number || order.id}`,
        metadata: {
          tenant_id: tenant.id,
          tenant_slug: tenant.slug || '',
          order_id: order.id,
          order_number: order.order_number || '',
          source: 'eccofood_android_tap_to_pay',
        },
      },
      {
        stripeAccount: tenant.stripe_account_id!,
        idempotencyKey: `tap-to-pay:${order.id}:${amount}:${currency}`,
      }
    )

    await supabase
      .from('orders')
      .update({
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('tenant_id', tenant.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    if (error instanceof Error && error.message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'STRIPE_NOT_READY') {
      return NextResponse.json({ error: 'Stripe no esta listo para este restaurante' }, { status: 400 })
    }

    console.error('[terminal payment intent]', error)
    return NextResponse.json({ error: 'No se pudo preparar el pago presencial' }, { status: 500 })
  }
}
