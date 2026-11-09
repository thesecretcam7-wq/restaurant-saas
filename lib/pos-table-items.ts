type TableItem = {
  item_id?: string | null;
  menu_item_id?: string | null;
  name: string;
  price: number;
  qty?: number;
  quantity?: number;
  notes?: string | null;
  is_manual?: boolean;
};

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  is_manual?: boolean;
};

function isManual(item: TableItem) {
  return item.is_manual === true || !(item.item_id || item.menu_item_id);
}

// A product identifier alone is not a bill line: price and preparation must match.
// Manual charges lose their temporary browser ID when saved, so use their name.
export function getPOSTableItemKey(item: TableItem): string {
  return JSON.stringify([
    isManual(item) ? ['manual', item.name] : ['catalog', item.item_id || item.menu_item_id],
    Number(item.price),
    item.notes || '',
  ]);
}

// Keep separately entered manual charges independently editable in a draft cart.
export function getPOSCartLineKey(item: CartItem): string {
  return item.is_manual
    ? JSON.stringify([item.menu_item_id, getPOSTableItemKey(item)])
    : getPOSTableItemKey(item);
}

export function mergePOSTableOrdersToCart(orders: Array<{ items: TableItem[] }>): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = getPOSTableItemKey(item);
      const quantity = Number(item.qty ?? item.quantity ?? 1);
      if (quantity <= 0) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        merged.set(key, {
          // Keep the real catalog ID for API requests; the UI uses the line key.
          menu_item_id: isManual(item) ? key : String(item.item_id || item.menu_item_id),
          name: item.name,
          price: Number(item.price),
          quantity,
          is_manual: isManual(item),
          notes: item.notes || undefined,
        });
      }
    }
  }
  return Array.from(merged.values());
}

export function getPOSItemQuantities(items: CartItem[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    const key = getPOSTableItemKey(item);
    quantities.set(key, (quantities.get(key) || 0) + Number(item.quantity));
  }
  return quantities;
}

// Consume each remainder once, including separate manual entries of the same value.
export function takePOSItemQuantities(items: CartItem[], quantities: Map<string, number>): CartItem[] {
  const remaining = new Map(quantities);
  return items.flatMap((item) => {
    const key = getPOSTableItemKey(item);
    const quantity = Math.min(Number(item.quantity), Math.max(0, remaining.get(key) || 0));
    remaining.set(key, Math.max(0, (remaining.get(key) || 0) - quantity));
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}
