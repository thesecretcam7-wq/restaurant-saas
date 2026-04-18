import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    const { tenantId, productName, sku, minStock, maxStock, costPerUnit, supplier } = body;

    if (!tenantId || !productName || !costPerUnit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert([
        {
          tenant_id: tenantId,
          product_name: productName,
          sku: sku || null,
          min_stock: minStock || 5,
          max_stock: maxStock || 100,
          cost_per_unit: costPerUnit,
          supplier: supplier || null,
          current_stock: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
