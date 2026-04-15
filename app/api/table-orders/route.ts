import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const tableId = searchParams.get('tableId');
  const uniqueCode = searchParams.get('code');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('table_orders')
      .select('*')
      .eq('tenant_id', tenantId);

    if (tableId) query = query.eq('table_id', tableId);

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching table orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, tableId, sessionId, orderItems, uniqueCode } = body;

    if (!tenantId || !tableId || !orderItems || !uniqueCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify QR code belongs to this table
    const { data: qrCode, error: qrError } = await supabase
      .from('table_qr_codes')
      .select('*')
      .eq('unique_code', uniqueCode)
      .eq('tenant_id', tenantId)
      .eq('table_id', tableId)
      .single();

    if (qrError || !qrCode) {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 403 });
    }

    // Create table order
    const { data, error } = await supabase
      .from('table_orders')
      .insert([
        {
          tenant_id: tenantId,
          table_id: tableId,
          session_id: sessionId,
          order_items: orderItems,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Also create corresponding orders (for kitchen)
    const tableOrderData = {
      tenant_id: tenantId,
      order_number: `TBL-${Date.now()}`,
      customer_name: `Mesa ${tableId}`,
      items: orderItems,
      subtotal: orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      tax: 0,
      total: orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      status: 'pending',
      payment_method: 'cash',
      delivery_type: 'pickup',
    };

    const { data: order } = await supabase
      .from('orders')
      .insert([tableOrderData])
      .select()
      .single();

    // Create order items for KDS
    if (order) {
      const orderItemsData = orderItems.map((item: any) => ({
        order_id: order.id,
        tenant_id: tenantId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        status: 'pending',
      }));

      await supabase.from('order_items').insert(orderItemsData);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating table order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, orderId, status } = body;

    if (!tenantId || !orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('table_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating table order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
