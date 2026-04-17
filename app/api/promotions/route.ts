import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const activeOnly = searchParams.get('activeOnly') === 'true';

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    let query = supabase.from('promotions').select('*').eq('tenant_id', tenantId);

    if (activeOnly) {
      const now = new Date().toISOString();
      query = query
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching promotions:', error);
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
    const {
      tenantId,
      name,
      description,
      promotionType,
      value,
      maxDiscount,
      minOrderValue,
      applicableTo,
      applicableItems,
      validFrom,
      validUntil,
      maxUses,
    } = body;

    if (!tenantId || !name || !promotionType || !value || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert([
        {
          tenant_id: tenantId,
          name,
          description,
          promotion_type: promotionType,
          value,
          max_discount: maxDiscount,
          min_order_value: minOrderValue,
          applicable_to: applicableTo || 'all',
          applicable_items: applicableItems || [],
          valid_from: validFrom,
          valid_until: validUntil,
          max_uses: maxUses,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
