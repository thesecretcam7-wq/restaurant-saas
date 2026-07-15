import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';
    const orderedIds: string[] = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!tenantId || !categoryId || orderedIds.length === 0) {
      return NextResponse.json({ error: 'Faltan datos para guardar el orden' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });

    const supabase = createServiceClient();
    const updates = orderedIds.map((id: string, index: number) =>
      supabase
        .from('menu_items')
        .update({ sort_order: (index + 1) * 10 })
        .eq('tenant_id', tenantId)
        .eq('category_id', categoryId)
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;

    if (error) {
      return NextResponse.json({ error: error.message || 'No se pudo guardar el orden' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
