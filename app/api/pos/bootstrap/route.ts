import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const settingsPromise = supabase
      .from('restaurant_settings')
      .select('tax_rate, display_name, phone, delivery_enabled, delivery_fee, delivery_zones, country')
      .eq('tenant_id', tenantId)
      .maybeSingle()
      .then(async (result) => {
        if (!result.error || result.error.code !== '42703') return result;
        return supabase
          .from('restaurant_settings')
          .select('tax_rate, display_name, phone, delivery_enabled, delivery_fee, country')
          .eq('tenant_id', tenantId)
          .maybeSingle();
      });

    const [categoriesRes, menuRes, tenantRes, settingsRes, tablesRes] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, name, price, category_id, image_url')
        .eq('tenant_id', tenantId)
        .eq('available', true)
        .order('name', { ascending: true }),
      supabase
        .from('tenants')
        .select('organization_name, logo_url, country')
        .eq('id', tenantId)
        .maybeSingle(),
      settingsPromise,
      supabase
        .from('tables')
        .select('id, table_number, seats, location')
        .eq('tenant_id', tenantId)
        .order('table_number', { ascending: true }),
    ]);

    const firstError = categoriesRes.error || menuRes.error || tenantRes.error || settingsRes.error || tablesRes.error;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({
      categories: categoriesRes.data || [],
      menu: menuRes.data || [],
      tenant: tenantRes.data || null,
      settings: {
        ...(settingsRes.data || {}),
        country: settingsRes.data?.country || tenantRes.data?.country || 'ES',
        delivery_zones: Array.isArray((settingsRes.data as any)?.delivery_zones)
          ? (settingsRes.data as any).delivery_zones
          : [],
      },
      tables: tablesRes.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
