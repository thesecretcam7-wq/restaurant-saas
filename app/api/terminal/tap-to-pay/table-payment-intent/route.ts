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
    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : []

    if (!tenantId || orderIds.length === 0) {
      return NextResponse.json({ error: 'Restaurante y pedidos requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenant = await resolveTerminalTenant(supabase, tenantId)
    await requireTenantAccess(tenant.id, { staffRoles: ['admin', 'cajero', 'camarero'] })
    assertTerminalReady(tenant)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, tenant_id, order_number, total, payment_status, table_number')
      .eq('tenant_id', tenant.id)
      .in('id', orderIds)

    if (ordersError || !orders || orders.length !== orderIds.length) {
      return NextResponse.json({ error: 'No se encontraron todos los pedidos de la mesa' }, { status: 404 })
    }

    const unpaidOrders = orders.filter((order) => order.payment_status !== 'paid')
    if (unpaidOrders.length === 0) {
      return NextResponse.json({ error: 'La mesa ya esta pagada' }, { status: 409 })
    }

    const total = unpaidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: 'El total de la mesa no es valido' }, { status: 400 })
    }

    const stripe = getStripe()
    const currencyInfo = await getTenantCurrency(supabase, tenant)
    const currency = currencyInfo.code.toLowerCase()
    const amount = toStripeMinorUnitAmount(total, currencyInfo.code)
    const normalizedOrderIds = unpaidOrders.map((order) => order.id).sort()

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        description: `Eccofood ${tenant.organization_name || tenant.slug} Mesa ${body.tableNumber || unpaidOrders[0]?.table_number || ''}`,
        metadata: {
          tenant_id: tenant.id,
          tenant_slug: tenant.slug || '',
          order_ids: JSON.stringify(normalizedOrderIds),
          table_number: String(body.tableNumber || unpaidOrders[0]?.table_number || ''),
          source: 'eccofood_android_tap_to_pay_table',
        },
      },
      {
        stripeAccount: tenant.stripe_account_id!,
        idempotencyKey: `tap-to-pay-table:${normalizedOrderIds.join('-')}:${amount}:${currency}`,
      }
    )

    await supabase
      .from('orders')
      .update({
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenant.id)
      .in('id', normalizedOrderIds)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
      orderIds: normalizedOrderIds,
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

    console.error('[terminal table payment intent]', error)
    return NextResponse.json({ error: 'No se pudo preparar el pago de la mesa' }, { status: 500 })
  }
}
