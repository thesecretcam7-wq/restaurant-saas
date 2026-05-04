import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const body = await request.json();
    const { tenantId, movementType, quantity, notes, referenceId, createdBy } = body;
    const { id } = await params;

    if (!tenantId || !movementType || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current inventory
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Calculate new stock
    let newStock = inventory.current_stock;
    if (movementType === 'sale' || movementType === 'damage') {
      newStock -= quantity;
    } else if (movementType === 'purchase' || movementType === 'return') {
      newStock += quantity;
    }

    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Create stock movement record
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert([
        {
          tenant_id: tenantId,
          inventory_id: id,
          movement_type: movementType,
          quantity: Math.abs(quantity),
          notes,
          reference_id: referenceId,
          created_by: createdBy,
        },
      ])
      .select()
      .single();

    if (movementError) throw movementError;

    // Update inventory stock
    const { data: updated, error: updateError } = await supabase
      .from('inventory')
      .update({ current_stock: newStock })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check for stock alerts
    if (newStock <= inventory.min_stock) {
      // Check if alert already exists
      const { data: existingAlert } = await supabase
        .from('stock_alerts')
        .select('id')
        .eq('inventory_id', id)
        .eq('is_resolved', false)
        .eq('alert_type', 'low_stock')
        .single();

      if (!existingAlert) {
        await supabase.from('stock_alerts').insert([
          {
            tenant_id: tenantId,
            inventory_id: id,
            alert_type: newStock === 0 ? 'out_of_stock' : 'low_stock',
          },
        ]);
      }
    }

    return NextResponse.json({ movement, updated });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const { id } = await params;

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('inventory_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
