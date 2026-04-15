import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Obtener mesas disponibles
    const { data: tables, error } = await supabase
      .from('tables')
      .select('id, table_number, seats, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'available')
      .order('table_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tables: tables || [] });
  } catch (err) {
    console.error('Error fetching available tables:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, status } = body;

    if (!tableId || !status) {
      return NextResponse.json({ error: 'Table ID and status are required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: table, error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', tableId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ table });
  } catch (err) {
    console.error('Error updating table status:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
