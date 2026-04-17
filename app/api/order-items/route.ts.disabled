import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('order_items')
      .select(`
        *,
        orders (
          order_number,
          table_number,
          waiter_name,
          created_at,
          status
        )
      `)
      .eq('tenant_id', tenantId);

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (status) {
      // Support comma-separated status values: "pending,confirmed,preparing,ready"
      const statusList = status.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        query = query.eq('status', statusList[0]);
      } else {
        query = query.in('status', statusList);
      }
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching order items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, orderId, items } = body;

    if (!tenantId || !orderId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, orderId, items' },
        { status: 400 }
      );
    }

    // Get order data first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      tenant_id: tenantId,
      menu_item_id: item.menu_item_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating order items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
