import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { syncOrderStatusFromItems } from '@/lib/order-status-sync';
import { sendServiceReadyPushNotifications } from '@/lib/push-server';

const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const requiresKitchen = searchParams.get('requiresKitchen');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] });

    let query = supabase
      .from('order_items')
      .select(`
        *,
        orders (
          order_number,
          display_number,
          table_number,
          waiter_name,
          created_at,
          status,
          delivery_type,
          customer_name,
          customer_phone
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

    if (requiresKitchen === 'true' || requiresKitchen === 'false') {
      query = query.eq('requires_kitchen', requiresKitchen === 'true');
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error) as any;
    }
    console.error('Error fetching order items:', error);
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
    const { tenantId, orderId, items } = body;

    if (!tenantId || !orderId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, orderId, items' },
        { status: 400 }
      );
    }
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] });

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
      menu_item_id: item.menu_item_id || item.item_id || null,
      name: item.name,
      quantity: item.qty ?? item.quantity ?? 1,
      price: item.price,
      notes: item.notes || null,
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error) as any;
    }
    console.error('Error creating order items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await request.json();
    const {
      tenantId,
      orderId,
      itemIds,
      status,
      started_at,
      completed_at,
      prepared_by,
      deliveryConfirmation,
      syncOrderStatus: shouldSyncOrderStatus = true,
    } = body;

    if (!tenantId || !status || (!orderId && (!Array.isArray(itemIds) || itemIds.length === 0))) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, status and orderId or itemIds' },
        { status: 400 }
      );
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] });

    if (status === 'delivered' && deliveryConfirmation !== true) {
      return NextResponse.json(
        { error: 'La entrega debe confirmarse desde la pantalla de Entregas.' },
        { status: 409 }
      );
    }

    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      status,
      updated_at: timestamp,
    };

    if (status === 'preparing' && !started_at) {
      updateData.started_at = timestamp;
    }
    if ((status === 'ready' || status === 'delivered') && !completed_at) {
      updateData.completed_at = timestamp;
    }
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;
    if (prepared_by) updateData.prepared_by = prepared_by;

    let targetItemsQuery = supabase
      .from('order_items')
      .select('id, order_id, status')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .neq('status', 'delivered');

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      targetItemsQuery = targetItemsQuery.in('id', itemIds);
    } else {
      targetItemsQuery = targetItemsQuery.eq('order_id', orderId);
    }

    const { data: targetItems, error: targetItemsError } = await targetItemsQuery;

    if (targetItemsError) {
      console.error('Error resolving target order items:', targetItemsError);
      return NextResponse.json({ error: targetItemsError.message }, { status: 500 });
    }

    const targetOrderIds = Array.from(
      new Set(
        (targetItems || [])
          .map((item: { order_id?: string }) => item.order_id)
          .filter((targetOrderId: string | undefined): targetOrderId is string => Boolean(targetOrderId))
      )
    );
    const itemIdsEligibleForReadyPush = new Set(
      status === 'ready'
        ? (targetItems || [])
            .filter((item: { id?: string; status?: string }) => item.id && item.status !== 'ready')
            .map((item: { id: string }) => item.id)
        : []
    );

    let query = supabase
      .from('order_items')
      .update(updateData)
      .eq('tenant_id', tenantId);

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      query = query
        .in('id', itemIds)
        .neq('status', 'cancelled')
        .neq('status', 'delivered');
    } else {
      query = query
        .eq('order_id', orderId)
        .neq('status', 'cancelled')
        .neq('status', 'delivered');
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error bulk updating order items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changedOrderIds = (data || [])
      .map((item: { order_id?: string }) => item.order_id)
      .filter((affectedOrderId: string | undefined): affectedOrderId is string => Boolean(affectedOrderId));
    const affectedOrderIds = Array.from(new Set([...targetOrderIds, ...changedOrderIds]));

    if (shouldSyncOrderStatus !== false) {
      await Promise.all(
        affectedOrderIds.map((affectedOrderId) =>
          syncOrderStatusFromItems(supabase, { orderId: affectedOrderId, tenantId })
        )
      );
    }

    const readyItemIds = status === 'ready'
      ? (data || [])
          .filter((item: { id?: string }) => item.id && itemIdsEligibleForReadyPush.has(item.id))
          .map((item: { id: string }) => item.id)
      : [];

    if (readyItemIds.length > 0) {
      await sendServiceReadyPushNotifications(supabase, { tenantId, itemIds: readyItemIds });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error) as any;
    }
    console.error('Error bulk updating order items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
