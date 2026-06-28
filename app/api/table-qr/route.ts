import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import QRCode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';

function generateUniqueCode() {
  return Math.random().toString(36).slice(2, 14).toUpperCase();
}

const DEFAULT_PUBLIC_QR_BASE_URL = 'https://eccofoodapp.com';

function normalizeSiteUrl(value?: string | null) {
  const fallback = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_QR_BASE_URL;
  const normalized = String(value || fallback).replace(/\/+$/, '');

  try {
    if (new URL(normalized).hostname === 'eccofood.vercel.app') {
      return DEFAULT_PUBLIC_QR_BASE_URL;
    }
  } catch {
    return DEFAULT_PUBLIC_QR_BASE_URL;
  }

  return normalized;
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const code = searchParams.get('code');

  try {
    if (code) {
      const { data: qrCode, error: qrError } = await supabase
        .from('table_qr_codes')
        .select(`
          id,
          tenant_id,
          table_id,
          unique_code,
          is_active,
          tables!inner(id, table_number, seats, location, status),
          tenants!inner(id, slug, organization_name, logo_url, country)
        `)
        .eq('unique_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (qrError) {
        return NextResponse.json({ error: qrError.message }, { status: 500 });
      }

      const table = relationOne<any>((qrCode as any)?.tables);
      const tenant = relationOne<any>((qrCode as any)?.tenants);
      if (!qrCode || !table || !tenant) {
        return NextResponse.json({ error: 'Codigo QR invalido' }, { status: 404 });
      }

      const [menuRes, categoriesRes, toppingsRes, settingsRes, brandingRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, tenant_id, category_id, name, description, price, image_url, available, featured, variants, sort_order')
          .eq('tenant_id', qrCode.tenant_id)
          .eq('available', true)
          .order('category_id', { ascending: true, nullsFirst: false })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('menu_categories')
          .select('id, name, sort_order, active')
          .eq('tenant_id', qrCode.tenant_id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('product_toppings')
          .select('id, menu_item_id, name, price, sort_order')
          .eq('tenant_id', qrCode.tenant_id)
          .order('sort_order', { ascending: true })
          .then((res) => res, () => ({ data: [], error: null })),
        supabase
          .from('restaurant_settings')
          .select('display_name, country, country_code, currency, currency_symbol, tax_rate')
          .eq('tenant_id', qrCode.tenant_id)
          .maybeSingle(),
        supabase
          .from('tenant_branding')
          .select('app_name, logo_url, primary_color, button_primary_color, background_color, text_primary_color')
          .eq('tenant_id', qrCode.tenant_id)
          .maybeSingle(),
      ]);

      if (menuRes.error) return NextResponse.json({ error: menuRes.error.message }, { status: 500 });
      if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });

      const items = menuRes.data || [];
      const itemCategoryIds = new Set(items.map((item: any) => item.category_id).filter(Boolean));
      const categories = (categoriesRes.data || []).filter((category: any) =>
        category.active !== false && itemCategoryIds.has(category.id)
      );

      return NextResponse.json({
        qrCode: {
          id: qrCode.id,
          uniqueCode: qrCode.unique_code,
          tableId: qrCode.table_id,
        },
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.organization_name,
          logoUrl: tenant.logo_url,
          country: tenant.country,
        },
        table,
        menu: items,
        categories,
        toppings: toppingsRes.data || [],
        settings: settingsRes.data || {},
        branding: brandingRes.data || {},
      });
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero'] });

    const { data, error } = await supabase
      .from('table_qr_codes')
      .select('id, tenant_id, table_id, unique_code, qr_code_data, is_active, tables(id, table_number, seats, location, status)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error fetching QR codes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { tenantId, tableId, siteUrl } = body;

    if (!tenantId || !tableId) {
      return NextResponse.json(
        { error: 'Faltan datos de la mesa' },
        { status: 400 }
      );
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, table_number')
      .eq('tenant_id', tenantId)
      .eq('id', tableId)
      .maybeSingle();

    if (tableError) return NextResponse.json({ error: tableError.message }, { status: 500 });
    if (!table) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });

    const { data: existingQR } = await supabase
      .from('table_qr_codes')
      .select('id, tenant_id, table_id, unique_code, qr_code_data, is_active, tables(id, table_number, seats, location, status)')
      .eq('tenant_id', tenantId)
      .eq('table_id', tableId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingQR) {
      const qrUrl = `${normalizeSiteUrl(siteUrl)}/order/${existingQR.unique_code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 720,
        margin: 2,
        color: {
          dark: '#07111f',
          light: '#ffffff',
        },
      });

      const { data: updatedQR, error: updateError } = await supabase
        .from('table_qr_codes')
        .update({ qr_code_data: qrCodeDataUrl })
        .eq('id', existingQR.id)
        .select('id, tenant_id, table_id, unique_code, qr_code_data, is_active, tables(id, table_number, seats, location, status)')
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json(updatedQR);
    }

    let uniqueCode = generateUniqueCode();
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data: collision } = await supabase
        .from('table_qr_codes')
        .select('id')
        .eq('unique_code', uniqueCode)
        .maybeSingle();
      if (!collision) break;
      uniqueCode = generateUniqueCode();
    }

    const qrUrl = `${normalizeSiteUrl(siteUrl)}/order/${uniqueCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 720,
      margin: 2,
      color: {
        dark: '#07111f',
        light: '#ffffff',
      },
    });

    const { data, error } = await supabase
      .from('table_qr_codes')
      .insert({
        tenant_id: tenantId,
        table_id: tableId,
        qr_code_data: qrCodeDataUrl,
        unique_code: uniqueCode,
      })
      .select('id, tenant_id, table_id, unique_code, qr_code_data, is_active, tables(id, table_number, seats, location, status)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error creating QR code:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
