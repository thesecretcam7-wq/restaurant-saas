import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { ensureInventoryItemsForTenant } from '@/lib/inventory-sync';

function toNumber(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const includeAlerts = searchParams.get('includeAlerts') === 'true';

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'] });

    await ensureInventoryItemsForTenant(supabase, tenantId);

    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('product_name');

    if (error) throw error;

    if (includeAlerts) {
      const { data: alerts } = await supabase
        .from('stock_alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_resolved', false);

      return NextResponse.json({ inventory, alerts });
    }

    return NextResponse.json(inventory);
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { tenantId, productName, sku, minStock, maxStock, initialStock, costPerUnit, supplier } = body;
    const normalizedName = String(productName || '').trim();
    const normalizedSku = String(sku || '').trim();
    const parsedMinStock = Math.max(0, Math.trunc(toNumber(minStock, 5)));
    const parsedMaxStock = Math.max(0, Math.trunc(toNumber(maxStock, 100)));
    const parsedInitialStock = Math.max(0, Math.trunc(toNumber(initialStock, 0)));
    const parsedCost = toNumber(costPerUnit);

    if (!tenantId || !normalizedName || !Number.isFinite(parsedCost) || parsedCost < 0) {
      return NextResponse.json(
        { error: 'Completa producto y costo unitario con valores validos' },
        { status: 400 }
      );
    }
    await requireTenantAccess(tenantId, { staffRoles: ['admin'] });

    if (normalizedSku) {
      const { data: existingSku, error: skuError } = await supabase
        .from('inventory')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('sku', normalizedSku)
        .maybeSingle();

      if (skuError) throw skuError;
      if (existingSku?.id) {
        return NextResponse.json({ error: 'Ese SKU ya existe en el inventario' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert([
        {
          tenant_id: tenantId,
          product_name: normalizedName,
          sku: normalizedSku || null,
          min_stock: parsedMinStock,
          max_stock: parsedMaxStock,
          cost_per_unit: parsedCost,
          supplier: String(supplier || '').trim() || null,
          current_stock: parsedInitialStock,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Inventory insert error:', error);
      return NextResponse.json({ error: error.message || 'No se pudo guardar en inventario' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar en inventario' }, { status: 500 });
  }
}
