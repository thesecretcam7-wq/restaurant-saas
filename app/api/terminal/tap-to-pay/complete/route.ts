import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import {
  assertTerminalReady,
  getStripe,
  markTerminalOrderPaid,
  resolveTerminalTenant,
} from '@/lib/terminal-payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tenantId = String(body.tenantId || '').trim()
    const orderId = String(body.orderId || '').trim()
    const paymentIntentId = String(body.paymentIntentId || '').trim()

    if (!tenantId || !orderId || !paymentIntentId) {
      return NextResponse.json({ error: 'Restaurante, pedido y pago requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenant = await resolveTerminalTenant(supabase, tenantId)
    const actor = await requireTenantAccess(tenant.id, { staffRoles: ['admin', 'cajero', 'camarero'] })
    assertTerminalReady(tenant)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('tenant_id', tenant.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {},
      { stripeAccount: tenant.stripe_account_id! }
    )

    const metadataMatches = paymentIntent.metadata?.tenant_id === tenant.id
      && paymentIntent.metadata?.order_id === order.id
    const orderMatches = !order.stripe_payment_intent_id || order.stripe_payment_intent_id === paymentIntent.id

    if (!metadataMatches || !orderMatches) {
      return NextResponse.json({ error: 'El pago no pertenece a este pedido' }, { status: 409 })
    }
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Pago no completado', status: paymentIntent.status },
        { status: 409 }
      )
    }

    const updatedOrder = await markTerminalOrderPaid({
      supabase,
      order,
      paymentIntent,
      actor,
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      paymentIntentStatus: paymentIntent.status,
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

    console.error('[terminal complete]', error)
    return NextResponse.json({ error: 'No se pudo confirmar el pago presencial' }, { status: 500 })
  }
}
