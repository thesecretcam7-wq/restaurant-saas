type RoutableOrderItem = {
  id?: string | null
  item_id?: string | null
  menu_item_id?: string | null
  name?: string | null
  quantity?: number | string | null
  qty?: number | string | null
  price?: number | string | null
  notes?: string | null
  requires_kitchen?: boolean | null
}

type BuildOrderItemRowsOptions = {
  orderId: string
  tenantId: string
  items: RoutableOrderItem[]
  includeKitchenItems: boolean
}

export function requiresKitchen(item: RoutableOrderItem) {
  return item.requires_kitchen !== false
}

export function buildOrderItemRows({
  orderId,
  tenantId,
  items,
  includeKitchenItems,
}: BuildOrderItemRowsOptions) {
  return items
    .filter((item) => includeKitchenItems || !requiresKitchen(item))
    .map((item) => {
      const itemNeedsKitchen = requiresKitchen(item)

      return {
        order_id: orderId,
        tenant_id: tenantId,
        menu_item_id: item.menu_item_id || item.item_id || null,
        name: String(item.name || '').trim(),
        quantity: Math.max(1, Number(item.qty ?? item.quantity ?? 1)),
        price: Math.max(0, Number(item.price || 0)),
        notes: item.notes || null,
        requires_kitchen: itemNeedsKitchen,
        status: itemNeedsKitchen ? 'pending' : 'ready',
      }
    })
    .filter((item) => item.name)
}
