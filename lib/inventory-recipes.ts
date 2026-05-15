type SupabaseClientLike = {
  from: (table: string) => any
}

type OrderLike = {
  id: string
  tenant_id: string
  order_number?: string | null
  items?: Array<{
    menu_item_id?: string | null
    item_id?: string | null
    id?: string | null
    name?: string | null
    qty?: number | string | null
    quantity?: number | string | null
  }> | null
}

type StockDirection = 'sale' | 'return'

function getItemQuantity(item: NonNullable<OrderLike['items']>[number]) {
  const quantity = Number(item.qty ?? item.quantity ?? 1)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

export async function applyRecipeStockMovement(
  supabase: SupabaseClientLike,
  order: OrderLike,
  direction: StockDirection
) {
  const items = Array.isArray(order.items) ? order.items : []
  if (!order.id || !order.tenant_id || items.length === 0) {
    return { applied: false, movements: 0 }
  }

  const movementType = direction === 'sale' ? 'sale' : 'return'
  const oppositeType = direction === 'sale' ? 'return' : 'sale'

  const { data: existingMovement } = await supabase
    .from('stock_movements')
    .select('id')
    .eq('tenant_id', order.tenant_id)
    .eq('reference_id', order.id)
    .eq('movement_type', movementType)
    .limit(1)
    .maybeSingle()

  if (existingMovement) {
    return { applied: false, movements: 0 }
  }

  if (direction === 'return') {
    const { data: saleMovement } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('tenant_id', order.tenant_id)
      .eq('reference_id', order.id)
      .eq('movement_type', oppositeType)
      .limit(1)
      .maybeSingle()

    if (!saleMovement) {
      return { applied: false, movements: 0 }
    }
  }

  const quantityByMenuItem = new Map<string, number>()
  for (const item of items) {
    const menuItemId = item.menu_item_id || item.item_id || item.id
    if (!menuItemId) continue
    quantityByMenuItem.set(menuItemId, (quantityByMenuItem.get(menuItemId) || 0) + getItemQuantity(item))
  }

  const menuItemIds = [...quantityByMenuItem.keys()]
  if (menuItemIds.length === 0) {
    return { applied: false, movements: 0 }
  }

  const { data: recipes, error: recipesError } = await supabase
    .from('product_recipes')
    .select('id, menu_item_id, inventory_id, quantity')
    .eq('tenant_id', order.tenant_id)
    .in('menu_item_id', menuItemIds)

  if (recipesError) {
    if (recipesError.code === '42P01') {
      return { applied: false, movements: 0 }
    }
    throw new Error(`No se pudo leer la receta de inventario: ${recipesError.message}`)
  }

  if (!recipes || recipes.length === 0) {
    return { applied: false, movements: 0 }
  }

  const requiredByInventory = new Map<string, number>()
  for (const recipe of recipes) {
    const soldQuantity = quantityByMenuItem.get(recipe.menu_item_id) || 0
    const ingredientQuantity = Number(recipe.quantity || 0)
    const totalRequired = soldQuantity * ingredientQuantity
    if (totalRequired > 0) {
      requiredByInventory.set(
        recipe.inventory_id,
        (requiredByInventory.get(recipe.inventory_id) || 0) + totalRequired
      )
    }
  }

  const inventoryIds = [...requiredByInventory.keys()]
  const { data: inventoryRows, error: inventoryError } = await supabase
    .from('inventory')
    .select('id, product_name, current_stock, min_stock')
    .eq('tenant_id', order.tenant_id)
    .in('id', inventoryIds)

  if (inventoryError) {
    throw new Error(`No se pudo leer el inventario: ${inventoryError.message}`)
  }

  const inventoryById = new Map<string, any>((inventoryRows || []).map((row: any) => [row.id, row]))

  if (direction === 'sale') {
    for (const [inventoryId, requiredQuantity] of requiredByInventory) {
      const inventory = inventoryById.get(inventoryId)
      const currentStock = Number(inventory?.current_stock || 0)
      if (!inventory || currentStock < requiredQuantity) {
        throw new Error(`Stock insuficiente para ${inventory?.product_name || 'un ingrediente'}`)
      }
    }
  }

  const movements = []
  for (const [inventoryId, quantity] of requiredByInventory) {
    const inventory = inventoryById.get(inventoryId)
    const currentStock = Number(inventory?.current_stock || 0)
    const newStock = direction === 'sale'
      ? currentStock - quantity
      : currentStock + quantity

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('tenant_id', order.tenant_id)
      .eq('id', inventoryId)

    if (updateError) {
      throw new Error(`No se pudo actualizar stock: ${updateError.message}`)
    }

    movements.push({
      tenant_id: order.tenant_id,
      inventory_id: inventoryId,
      movement_type: movementType,
      quantity,
      notes: direction === 'sale'
        ? `Descuento automatico por venta ${order.order_number || order.id}`
        : `Devolucion automatica por anulacion ${order.order_number || order.id}`,
      reference_id: order.id,
      created_by: 'system',
    })
  }

  const { error: movementError } = await supabase.from('stock_movements').insert(movements)
  if (movementError) {
    throw new Error(`No se pudo guardar el movimiento de stock: ${movementError.message}`)
  }

  const lowStockAlerts = []
  for (const [inventoryId] of requiredByInventory) {
    const inventory = inventoryById.get(inventoryId)
    if (!inventory) continue
    const newStock = direction === 'sale'
      ? Number(inventory.current_stock || 0) - (requiredByInventory.get(inventoryId) || 0)
      : Number(inventory.current_stock || 0) + (requiredByInventory.get(inventoryId) || 0)

    if (direction === 'sale' && newStock <= Number(inventory.min_stock || 0)) {
      lowStockAlerts.push({
        tenant_id: order.tenant_id,
        inventory_id: inventoryId,
        alert_type: newStock <= 0 ? 'out_of_stock' : 'low_stock',
      })
    }
  }

  if (lowStockAlerts.length > 0) {
    await supabase.from('stock_alerts').insert(lowStockAlerts)
  }

  return { applied: true, movements: movements.length }
}

export async function returnRecipeStockForItems(
  supabase: SupabaseClientLike,
  order: OrderLike,
  itemsToReturn: NonNullable<OrderLike['items']>,
  reason?: string | null
) {
  if (!order.id || !order.tenant_id || !Array.isArray(itemsToReturn) || itemsToReturn.length === 0) {
    return { applied: false, movements: 0 }
  }

  return applyRecipeStockMovementWithoutIdempotency(
    supabase,
    { ...order, items: itemsToReturn },
    'return',
    reason || `Devolucion parcial por edicion ${order.order_number || order.id}`,
    `${order.id}:edit:${Date.now()}`
  )
}

async function applyRecipeStockMovementWithoutIdempotency(
  supabase: SupabaseClientLike,
  order: OrderLike,
  direction: StockDirection,
  movementNote: string,
  referenceId: string
) {
  const items = Array.isArray(order.items) ? order.items : []
  if (!order.id || !order.tenant_id || items.length === 0) {
    return { applied: false, movements: 0 }
  }

  const quantityByMenuItem = new Map<string, number>()
  for (const item of items) {
    const menuItemId = item.menu_item_id || item.item_id || item.id
    if (!menuItemId) continue
    quantityByMenuItem.set(menuItemId, (quantityByMenuItem.get(menuItemId) || 0) + getItemQuantity(item))
  }

  const menuItemIds = [...quantityByMenuItem.keys()]
  if (menuItemIds.length === 0) {
    return { applied: false, movements: 0 }
  }

  const { data: recipes, error: recipesError } = await supabase
    .from('product_recipes')
    .select('id, menu_item_id, inventory_id, quantity')
    .eq('tenant_id', order.tenant_id)
    .in('menu_item_id', menuItemIds)

  if (recipesError) {
    if (recipesError.code === '42P01') {
      return { applied: false, movements: 0 }
    }
    throw new Error(`No se pudo leer la receta de inventario: ${recipesError.message}`)
  }

  if (!recipes || recipes.length === 0) {
    return { applied: false, movements: 0 }
  }

  const requiredByInventory = new Map<string, number>()
  for (const recipe of recipes) {
    const itemQuantity = quantityByMenuItem.get(recipe.menu_item_id) || 0
    const ingredientQuantity = Number(recipe.quantity || 0)
    const totalRequired = itemQuantity * ingredientQuantity
    if (totalRequired > 0) {
      requiredByInventory.set(
        recipe.inventory_id,
        (requiredByInventory.get(recipe.inventory_id) || 0) + totalRequired
      )
    }
  }

  const inventoryIds = [...requiredByInventory.keys()]
  const { data: inventoryRows, error: inventoryError } = await supabase
    .from('inventory')
    .select('id, product_name, current_stock, min_stock')
    .eq('tenant_id', order.tenant_id)
    .in('id', inventoryIds)

  if (inventoryError) {
    throw new Error(`No se pudo leer el inventario: ${inventoryError.message}`)
  }

  const inventoryById = new Map<string, any>((inventoryRows || []).map((row: any) => [row.id, row]))
  const movementType = direction === 'sale' ? 'sale' : 'return'
  const movements = []

  for (const [inventoryId, quantity] of requiredByInventory) {
    const inventory = inventoryById.get(inventoryId)
    const currentStock = Number(inventory?.current_stock || 0)
    const newStock = direction === 'sale' ? currentStock - quantity : currentStock + quantity

    if (direction === 'sale' && currentStock < quantity) {
      throw new Error(`Stock insuficiente para ${inventory?.product_name || 'un ingrediente'}`)
    }

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('tenant_id', order.tenant_id)
      .eq('id', inventoryId)

    if (updateError) {
      throw new Error(`No se pudo actualizar stock: ${updateError.message}`)
    }

    movements.push({
      tenant_id: order.tenant_id,
      inventory_id: inventoryId,
      movement_type: movementType,
      quantity,
      notes: movementNote,
      reference_id: referenceId,
      created_by: 'system',
    })
  }

  const { error: movementError } = await supabase.from('stock_movements').insert(movements)
  if (movementError) {
    throw new Error(`No se pudo guardar el movimiento de stock: ${movementError.message}`)
  }

  return { applied: true, movements: movements.length }
}
