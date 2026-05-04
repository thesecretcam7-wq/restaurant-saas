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

    // Obtener camareros activos del turno actual
    const { data: staff, error } = await supabase
      .from('staff_members')
      .select('id, name, role')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ staff: staff || [] });
  } catch (err) {
    console.error('Error fetching active staff:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
