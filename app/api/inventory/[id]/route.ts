import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tenantId, productName, sku, minStock, maxStock, costPerUnit, supplier } = body;

    if (!tenantId || !productName || !Number.isFinite(Number(costPerUnit))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'] });
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('inventory')
      .update({
        product_name: String(productName).trim(),
        sku: sku ? String(sku).trim() : null,
        min_stock: Math.max(0, Number(minStock) || 0),
        max_stock: Math.max(0, Number(maxStock) || 0),
        cost_per_unit: Math.max(0, Number(costPerUnit) || 0),
        supplier: supplier ? String(supplier).trim() : null,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = request.nextUrl.searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'] });
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
