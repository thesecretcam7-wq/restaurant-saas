import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const staffId = searchParams.get('staffId');
  const date = searchParams.get('date');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    if (date && staffId) {
      // Get shift assignments for a staff member on a specific date
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*, shifts(*), staff(*)')
        .eq('tenant_id', tenantId)
        .eq('staff_id', staffId)
        .eq('date', date);

      if (error) throw error;
      return NextResponse.json(data);
    } else if (date) {
      // Get all assignments for a date
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*, shifts(*), staff(*)')
        .eq('tenant_id', tenantId)
        .eq('date', date);

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Get all shifts
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error fetching shifts:', error);
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
    const { tenantId, name, startTime, endTime, color } = body;

    if (!tenantId || !name || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert([
        {
          tenant_id: tenantId,
          name,
          start_time: startTime,
          end_time: endTime,
          color: color || '#3B82F6',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
