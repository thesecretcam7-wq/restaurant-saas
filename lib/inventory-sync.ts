type SupabaseLike = {
  from: (table: string) => any;
};

interface EnsureInventoryItemInput {
  tenantId: string;
  productId: string;
  productName: string;
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
    unit: 'unidad',
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

function isMissingProductIdColumn(error: any) {
  if (!error) return false;
  const message = String(error.message || '');
  return error.code === '42703' || message.includes('product_id');
}
