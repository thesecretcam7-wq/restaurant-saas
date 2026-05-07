import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = await params;
    const body = await request.json();
    const { tenantId, status, started_at, completed_at, prepared_by } = body;

    if (!tenantId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, status' },
        { status: 400 }
      );
    }
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] });

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'preparing' && !started_at) {
      updateData.started_at = new Date().toISOString();
    }
    if ((status === 'ready' || status === 'delivered') && !completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (started_at) updateData.started_at = started_at;
    if (completed_at) updateData.completed_at = completed_at;
    if (prepared_by) updateData.prepared_by = prepared_by;

    const { data, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Cascade: recalculate orders.status from all non-cancelled items
    if (data.order_id) {
      const { data: siblings } = await supabase
        .from('order_items')
        .select('status')
        .eq('order_id', data.order_id)
        .neq('status', 'cancelled');

      if (siblings && siblings.length > 0) {
        const PRIORITY: Record<string, number> = {
          pending: 0, confirmed: 1, preparing: 2, ready: 3, delivered: 4,
        };
        const minStatus = siblings.reduce((min: string, item: { status: string }) => {
          return (PRIORITY[item.status] ?? 0) < (PRIORITY[min] ?? 0) ? item.status : min;
        }, siblings[0].status);

        await supabase
          .from('orders')
          .update({ status: minStatus, updated_at: new Date().toISOString() })
          .eq('id', data.order_id);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('PATCH order-item error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero', 'cocinero'] });

    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
