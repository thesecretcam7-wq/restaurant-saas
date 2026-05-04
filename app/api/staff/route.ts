import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const activeOnly = searchParams.get('activeOnly') === 'true';

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    // SECURITY: Verify user owns the tenant by checking ownership via slug lookup
    // For this endpoint, we need to convert tenantId to slug for verification
    const supabaseAdmin = createServiceClient();

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, owner_id')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify ownership using the helper function
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers');
    try {
      await verifyTenantOwnership(request, tenant.slug);
    } catch (authError) {
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500;
      return sendErrorResponse(authError, statusCode);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('staff').select('*').eq('tenant_id', tenantId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name');

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      name,
      email,
      phone,
      role,
      position,
      hourlyRate,
      emergencyContact,
      emergencyPhone,
    } = body;

    if (!tenantId || !name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // SECURITY: Verify user owns the tenant
    const supabaseAdmin = createServiceClient();

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, slug, owner_id')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Verify ownership using the helper function
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers');
    try {
      await verifyTenantOwnership(request, tenant.slug);
    } catch (authError) {
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500;
      return sendErrorResponse(authError, statusCode);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('staff')
      .insert([
        {
          tenant_id: tenantId,
          name,
          email,
          phone,
          role,
          position,
          hourly_rate: hourlyRate,
          emergency_contact: emergencyContact,
          emergency_phone: emergencyPhone,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
