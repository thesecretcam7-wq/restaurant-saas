import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import {
  assertTerminalReady,
  getStripe,
  markTerminalOrdersPaid,
  resolveTerminalTenant,
} from '@/lib/terminal-payments'

function parseOrderIds(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((id) => String(id || '')).filter(Boolean) : []
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tenantId = String(body.tenantId || '').trim()
    const paymentIntentId = String(body.paymentIntentId || '').trim()
    const requestedOrderIds = Array.isArray(body.orderIds)
      ? body.orderIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : []

    if (!tenantId || !paymentIntentId || requestedOrderIds.length === 0) {
      return NextResponse.json({ error: 'Restaurante, pedidos y pago requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenant = await resolveTerminalTenant(supabase, tenantId)
    const actor = await requireTenantAccess(tenant.id, { staffRoles: ['admin', 'cajero', 'camarero'] })
    assertTerminalReady(tenant)

    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {},
      { stripeAccount: tenant.stripe_account_id! }
    )

    const intentOrderIds = parseOrderIds(paymentIntent.metadata?.order_ids).sort()
    const normalizedRequestedIds = requestedOrderIds.sort()
    const metadataMatches = paymentIntent.metadata?.tenant_id === tenant.id
      && intentOrderIds.join('|') === normalizedRequestedIds.join('|')

    if (!metadataMatches) {
      return NextResponse.json({ error: 'El pago no pertenece a esta mesa' }, { status: 409 })
    }
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Pago no completado', status: paymentIntent.status },
        { status: 409 }
      )
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenant.id)
      .in('id', normalizedRequestedIds)

    if (ordersError || !orders || orders.length !== normalizedRequestedIds.length) {
      return NextResponse.json({ error: 'No se encontraron todos los pedidos de la mesa' }, { status: 404 })
    }

    const updatedOrders = await markTerminalOrdersPaid({
      supabase,
      orders,
      paymentIntent,
      actor,
    })

    return NextResponse.json({
      success: true,
      orders: updatedOrders,
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

    console.error('[terminal complete table]', error)
    return NextResponse.json({ error: 'No se pudo confirmar el pago de la mesa' }, { status: 500 })
  }
}
