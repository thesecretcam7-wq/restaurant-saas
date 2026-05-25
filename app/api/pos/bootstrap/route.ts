import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant';
import { getPageConfig } from '@/lib/pageConfig';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const [categoriesRes, menuRes, tenantRes, settingsRes, tablesRes] = await Promise.all([
      supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, name, price, category_id, description, image_url')
        .eq('tenant_id', tenantId)
        .eq('available', true)
        .order('name', { ascending: true }),
      supabase
        .from('tenants')
        .select('id, slug, organization_name, logo_url, country, metadata')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase
        .from('restaurant_settings')
        .select('tax_rate, display_name, phone, delivery_enabled, delivery_fee, delivery_zones, country, printer_auto_print')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
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

    const tenantSlug = tenantRes.data?.slug || tenantId;
    const context = tenantRes.data ? await getTenantContext(tenantSlug) : null;
    const branding = context?.branding;
    const pageConfig = getPageConfig((context?.tenant as any)?.metadata?.page_config || branding?.page_config);
    const isLightTheme = pageConfig.appearance.theme_mode === 'light';

    return NextResponse.json({
      categories: categoriesRes.data || [],
      menu: menuRes.data || [],
      tenant: tenantRes.data || null,
      settings: {
        ...(settingsRes.data || {}),
        country: settingsRes.data?.country || tenantRes.data?.country || 'ES',
      },
      branding: {
        appName: branding?.app_name || tenantRes.data?.organization_name || settingsRes.data?.display_name || 'Comandero',
        primaryColor: isLightTheme ? '#ff5a00' : '#D4AF37',
        secondaryColor: isLightTheme ? '#ffffff' : '#1A1F2C',
        accentColor: isLightTheme ? '#ff1f1f' : '#D35A37',
        backgroundColor: isLightTheme ? '#ffffff' : '#0B0E14',
        surfaceColor: isLightTheme ? '#ffffff' : '#1A1F2C',
        buttonPrimaryColor: isLightTheme ? '#ff5a00' : '#D35A37',
        buttonSecondaryColor: isLightTheme ? '#ff1f1f' : '#D4AF37',
        textPrimaryColor: isLightTheme ? '#07111f' : '#ffffff',
        textSecondaryColor: isLightTheme ? 'rgba(7, 17, 31, 0.70)' : '#8b97a8',
        borderColor: isLightTheme ? 'rgba(7, 17, 31, 0.12)' : 'rgba(212, 175, 55, 0.18)',
        isLightTheme,
        logoUrl: branding?.logo_url || tenantRes.data?.logo_url || '',
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
