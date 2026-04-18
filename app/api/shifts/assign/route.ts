import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await request.json();
    const { tenantId, staffId, shiftId, date } = body;

    if (!tenantId || !staffId || !shiftId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shift_assignments')
      .insert([
        {
          tenant_id: tenantId,
          staff_id: staffId,
          shift_id: shiftId,
          date,
          status: 'scheduled',
        },
      ])
      .select('*, shifts(*), staff(*)')
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error assigning shift:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This staff member already has a shift on this date' },
        { status: 400 }
      );
    }
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
    const { assignmentId, tenantId, status, hoursWorked } = body;

    if (!assignmentId || !tenantId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: any = { status };
    if (hoursWorked) updateData.hours_worked = hoursWorked;

    const { data, error } = await supabase
      .from('shift_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId)
      .select('*, shifts(*), staff(*)')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating shift assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');
    const tenantId = searchParams.get('tenantId');

    if (!assignmentId || !tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('shift_assignments')
      .delete()
      .eq('id', assignmentId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
