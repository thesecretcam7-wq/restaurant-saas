import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tenantId = searchParams.get('tenantId');

  if (!code || !tenantId) {
    return NextResponse.json(
      { error: 'Missing code or tenantId' },
      { status: 400 }
    );
  }

  try {
    // Get discount code
    const { data: discountCode, error: codeError } = await supabase
      .from('discount_codes')
      .select('*, promotions(*)')
      .eq('code', code.toUpperCase())
      .eq('tenant_id', tenantId)
      .single();

    if (codeError || !discountCode) {
      return NextResponse.json(
        { error: 'Invalid discount code' },
        { status: 404 }
      );
    }

    // Check if code is active and not expired
    const promotion = discountCode.promotions;
    const now = new Date();

    if (!discountCode.is_active) {
      return NextResponse.json({ error: 'Discount code is inactive' }, { status: 400 });
    }

    if (new Date(promotion.valid_from) > now) {
      return NextResponse.json({ error: 'Discount code not yet valid' }, { status: 400 });
    }

    if (new Date(promotion.valid_until) < now) {
      return NextResponse.json({ error: 'Discount code has expired' }, { status: 400 });
    }

    if (discountCode.max_uses && discountCode.current_uses >= discountCode.max_uses) {
      return NextResponse.json(
        { error: 'Discount code has reached max uses' },
        { status: 400 }
      );
    }

    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) {
      return NextResponse.json(
        { error: 'Promotion has reached max uses' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      code: discountCode.code,
      promotion: {
        id: promotion.id,
        type: promotion.promotion_type,
        value: promotion.value,
        maxDiscount: promotion.max_discount,
        minOrderValue: promotion.min_order_value,
        applicableTo: promotion.applicable_to,
      },
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, promotionId, code, maxUses } = body;

    if (!tenantId || !promotionId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('discount_codes')
      .insert([
        {
          tenant_id: tenantId,
          promotion_id: promotionId,
          code: code.toUpperCase(),
          max_uses: maxUses,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
