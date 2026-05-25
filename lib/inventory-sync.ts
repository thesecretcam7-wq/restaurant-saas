type SupabaseLike = {
  from: (table: string) => any;
};

interface EnsureInventoryItemInput {
  tenantId: string;
  productId: string;
  productName: string;
}

interface MenuItemForInventory {
  id: string;
  name: string | null;
}

export async function ensureInventoryItemForMenuItem(
  supabase: SupabaseLike,
  { tenantId, productId, productName }: EnsureInventoryItemInput
) {
  const normalizedName = productName.trim();

  const productLinkedLookup = await supabase
    .from('inventory')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .limit(1);

  const supportsProductId = !isMissingProductIdColumn(productLinkedLookup.error);
  if (productLinkedLookup.error && supportsProductId) throw productLinkedLookup.error;

  const fallbackLookup = supportsProductId
    ? null
    : await supabase
        .from('inventory')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('product_name', normalizedName)
        .limit(1);

  if (fallbackLookup?.error) throw fallbackLookup.error;

  const existingItem = supportsProductId
    ? productLinkedLookup.data?.[0]
    : fallbackLookup?.data?.[0];
  if (existingItem?.id) {
    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        product_name: normalizedName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingItem.id);

    if (updateError) throw updateError;
    return existingItem;
  }

  const insertPayload: Record<string, unknown> = {
    tenant_id: tenantId,
    product_name: normalizedName,
    current_stock: 0,
    min_stock: 0,
    max_stock: 100,
    cost_per_unit: 0,
  };

  if (supportsProductId) {
    insertPayload.product_id = productId;
  }

  const { data: inventoryItem, error: insertError } = await supabase
    .from('inventory')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) throw insertError;
  return inventoryItem;
}

export async function ensureInventoryItemsForTenant(
  supabase: SupabaseLike,
  tenantId: string
) {
  const { data: products, error } = await supabase
    .from('menu_items')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) throw error;

  const productRows = ((products || []) as MenuItemForInventory[])
    .filter(product => product.id && product.name?.trim())
    .map(product => ({ id: product.id, name: product.name!.trim() }));

  if (productRows.length === 0) return;

  const linkedInventoryLookup = await supabase
    .from('inventory')
    .select('id, product_id, product_name')
    .eq('tenant_id', tenantId);

  const supportsProductId = !isMissingProductIdColumn(linkedInventoryLookup.error);
  if (linkedInventoryLookup.error && supportsProductId) throw linkedInventoryLookup.error;

  const inventoryLookup = supportsProductId
    ? linkedInventoryLookup
    : await supabase
        .from('inventory')
        .select('id, product_name')
        .eq('tenant_id', tenantId);

  if (inventoryLookup.error) throw inventoryLookup.error;

  const existingRows = (inventoryLookup.data || []) as Array<{
    id: string;
    product_id?: string | null;
    product_name?: string | null;
  }>;

  const existingByProductId = new Map(
    existingRows
      .filter(row => row.product_id)
      .map(row => [row.product_id as string, row])
  );
  const existingByName = new Map(
    existingRows
      .filter(row => row.product_name?.trim())
      .map(row => [row.product_name!.trim().toLowerCase(), row])
  );

  const inserts: Record<string, unknown>[] = [];
  const updates: Promise<unknown>[] = [];

  for (const product of productRows) {
    const existingItem = supportsProductId
      ? existingByProductId.get(product.id)
      : existingByName.get(product.name.toLowerCase());

    if (existingItem?.id) {
      if (supportsProductId && existingItem.product_name !== product.name) {
        updates.push(
          supabase
            .from('inventory')
            .update({
              product_name: product.name,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingItem.id)
        );
      }
      continue;
    }

    const insertPayload: Record<string, unknown> = {
      tenant_id: tenantId,
      product_name: product.name,
      current_stock: 0,
      min_stock: 0,
      max_stock: 100,
      cost_per_unit: 0,
    };

    if (supportsProductId) {
      insertPayload.product_id = product.id;
    }

    inserts.push(insertPayload);
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from('inventory')
      .insert(inserts);

    if (insertError) throw insertError;
  }

  if (updates.length > 0) {
    const results = await Promise.all(updates);
    const failedUpdate = results.find((result: any) => result?.error);
    if (failedUpdate) throw (failedUpdate as any).error;
  }
}

function isMissingProductIdColumn(error: any) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === '42703' || message.includes('product_id');
}
