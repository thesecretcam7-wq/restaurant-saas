'use client'

import { getOfflineStorage, type OfflineOrder } from './storage'

type POSOfflineItem = {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  notes?: string | null
}

export type POSOfflineOrderInput = {
  tenantId: string
  items: POSOfflineItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'stripe'
  deliveryType: 'takeaway' | 'pickup' | 'dine-in'
  waiter_id?: string | null
  waiterName?: string | null
  table_id?: string | null
  tableNumber?: number | null
  tip?: number | null
  notes?: string | null
  amountPaid?: number | null
}

export function isNetworkPaymentError(error: unknown) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('load failed') ||
    message.includes('internet') ||
    message.includes('offline')
  )
}

export async function saveOfflinePOSOrder(input: POSOfflineOrderInput) {
  const storage = getOfflineStorage()
  const now = new Date()
  const localId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const orderNumber = `OFF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Date.now()).slice(-6)}`

  const order: OfflineOrder = {
    id: localId,
    orderId: localId,
    orderNumber,
    tenantId: input.tenantId,
    customerInfo: {
      name: 'POS Counter',
      email: null,
      phone: 'N/A',
    },
    items: input.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      qty: item.quantity,
      notes: item.notes || null,
    })),
    subtotal: input.subtotal,
    discount: input.discount,
    total: input.total,
    paymentMethod: input.paymentMethod,
    deliveryType: input.deliveryType,
    waiter_id: input.waiter_id || null,
    waiterName: input.waiterName || null,
    table_id: input.table_id || null,
    tableNumber: input.tableNumber || null,
    tip: input.tip || null,
    notes: input.notes || null,
    amountPaid: input.amountPaid || null,
    source: 'pos-offline',
    status: 'completed',
    createdAt: now.toISOString(),
  }

  await storage.saveOrder(order)
  return order
}

export async function countPendingPOSOrders(tenantId: string) {
  const storage = getOfflineStorage()
  const orders = await storage.getUnsyncedOrders()
  return orders.filter((order) => order.tenantId === tenantId && order.source === 'pos-offline').length
}

export async function syncOfflinePOSOrders(tenantId: string, csrfToken?: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, remaining: await countPendingPOSOrders(tenantId), errors: [] as string[] }
  }

  const storage = getOfflineStorage()
  const orders = (await storage.getUnsyncedOrders()).filter(
    (order) => order.tenantId === tenantId && order.source === 'pos-offline'
  )
  const errors: string[] = []
  let synced = 0

  for (const offlineOrder of orders) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          customerInfo: offlineOrder.customerInfo || {
            name: 'POS Counter',
            email: null,
            phone: 'N/A',
          },
          items: offlineOrder.items.map((item) => ({
            menu_item_id: item.menu_item_id,
            name: item.name,
            price: item.price,
            qty: item.qty ?? item.quantity,
            notes: item.notes || null,
          })),
          paymentMethod: offlineOrder.paymentMethod === 'stripe' ? 'cash' : offlineOrder.paymentMethod,
          deliveryType: offlineOrder.deliveryType || 'takeaway',
          waiter_id: offlineOrder.waiter_id || null,
          waiterName: offlineOrder.waiterName || null,
          table_id: offlineOrder.table_id || null,
          tableNumber: offlineOrder.tableNumber || null,
          tip: offlineOrder.tip || null,
          notes: offlineOrder.notes
            ? `${offlineOrder.notes} | Venta offline ${offlineOrder.orderNumber}`
            : `Venta offline ${offlineOrder.orderNumber}`,
          amountPaid: offlineOrder.amountPaid || null,
          source: 'pos-offline',
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo subir la venta offline')
      }

      const createdOrder = await response.json()
      if (createdOrder?.orderId) {
        const paidResponse = await fetch(`/api/orders/${createdOrder.orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            tenantId,
            payment_status: 'paid',
            status: offlineOrder.deliveryType === 'dine-in' ? 'delivered' : 'confirmed',
          }),
        })

        if (!paidResponse.ok) {
          const data = await paidResponse.json().catch(() => ({}))
          throw new Error(data.error || 'La venta subio, pero no se pudo marcar como pagada')
        }
      }

      await storage.markOrderSynced(offlineOrder.id)
      synced++
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  return {
    synced,
    remaining: await countPendingPOSOrders(tenantId),
    errors,
  }
}
