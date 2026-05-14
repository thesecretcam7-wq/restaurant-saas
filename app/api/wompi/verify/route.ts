import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { applyRecipeStockMovement } from '@/lib/inventory-recipes'
import { getWompiApiBase, normalizeWompiStatus } from '@/lib/wompi'
import { decryptServerSecret } from '@/lib/server-secret-box'
import { getPaymentConfig, selectSettingsWithPaymentFallback } from '@/lib/payment-settings'

async function createKitchenItemsIfNeeded(supabase: any, order: any) {
  if (!Array.isArray(order.items) || order.items.length === 0) return

  const { count } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('order_id', order.id)

  if ((count ?? 0) > 0) return

  const orderItemsData = order.items.map((item: any) => ({
    order_id: order.id,
    tenant_id: order.tenant_id,
    menu_item_id: item.menu_item_id || null,
    name: item.name,
    quantity: item.qty ?? item.quantity ?? 1,
    price: item.price,
    notes: item.notes || null,
    status: 'pending',
  }))

  const { error } = await supabase.from('order_items').insert(orderItemsData)
  if (error) console.error('[wompi/verify] order_items creation error:', error.message)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const transactionId = body.transactionId || body.id
    const orderId = body.orderId
    const reference = body.reference

    if (!transactionId || (!orderId && !reference)) {
      return NextResponse.json({ error: 'Faltan datos de verificacion' }, { status: 400 })
    }

    const supabase = createServiceClient()
    let orderQuery = supabase
      .from('orders')
      .select('id, tenant_id, order_number, wompi_reference, payment_status, items')

    orderQuery = orderId ? orderQuery.eq('id', orderId) : orderQuery.eq('order_number', reference)
    let orderResult = await orderQuery.maybeSingle()
    if (orderResult.error?.message?.includes('wompi_reference')) {
      let fallbackQuery = supabase
        .from('orders')
        .select('id, tenant_id, order_number, payment_status, items')
      fallbackQuery = orderId ? fallbackQuery.eq('id', orderId) : fallbackQuery.eq('order_number', reference)
      orderResult = await fallbackQuery.maybeSingle()
    }

    const { data: order } = orderResult

    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    const { data: settingsRow, error: settingsError } = await selectSettingsWithPaymentFallback(
      supabase,
      order.tenant_id,
      'printer_settings, wompi_environment, wompi_private_key',
      'printer_settings'
    )

    if (settingsError) {
      console.error('[wompi/verify] settings error:', settingsError)
      return NextResponse.json({ error: 'No pude leer la configuracion de Wompi' }, { status: 500 })
    }

    const settings = getPaymentConfig(settingsRow)
    const wompiPrivateKey = decryptServerSecret(settings?.wompi_private_key)

    if (!wompiPrivateKey) {
      return NextResponse.json({ error: 'Wompi no esta configurado' }, { status: 400 })
    }

    const response = await fetch(`${getWompiApiBase(settings?.wompi_environment)}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${wompiPrivateKey}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'No se pudo verificar el pago en Wompi' }, { status: 502 })
    }

    const payload = await response.json()
    const transaction = payload?.data
    if (!transaction || transaction.reference !== order.order_number) {
      return NextResponse.json({ error: 'La referencia de Wompi no coincide con el pedido' }, { status: 400 })
    }

    const paymentStatus = normalizeWompiStatus(transaction.status)
    const shouldApplySale = paymentStatus === 'paid' && order.payment_status !== 'paid'

    if (shouldApplySale) {
      try {
        await applyRecipeStockMovement(supabase, order, 'sale')
      } catch (stockError) {
        console.error('[wompi/verify] stock deduction error:', stockError)
      }
    }

    let updateResult = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: paymentStatus === 'paid' ? 'confirmed' : order.payment_status === 'paid' ? 'confirmed' : 'pending',
        wompi_transaction_id: String(transaction.id || transactionId),
        wompi_reference: transaction.reference,
      })
      .eq('id', order.id)
      .select('id, tenant_id, order_number, payment_status, items')
      .single()

    if (updateResult.error?.message?.includes('wompi_')) {
      updateResult = await supabase
        .from('orders')
        .update({
          payment_status: paymentStatus,
          status: paymentStatus === 'paid' ? 'confirmed' : order.payment_status === 'paid' ? 'confirmed' : 'pending',
        })
        .eq('id', order.id)
        .select('id, tenant_id, order_number, payment_status, items')
        .single()
    }

    const { data: updatedOrder, error } = updateResult

    if (error) {
      console.error('[wompi/verify] update error:', error.message)
      return NextResponse.json({ error: 'No se pudo actualizar el pedido' }, { status: 500 })
    }

    if (paymentStatus === 'paid') {
      await createKitchenItemsIfNeeded(supabase, updatedOrder)
    }

    return NextResponse.json({
      success: true,
      payment_status: paymentStatus,
      order_id: order.id,
      transaction_id: transaction.id || transactionId,
    })
  } catch (error) {
    console.error('[wompi/verify] error:', error)
    return NextResponse.json({ error: 'Error verificando Wompi' }, { status: 500 })
  }
}
