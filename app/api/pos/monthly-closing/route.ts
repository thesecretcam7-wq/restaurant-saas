import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';

const COUNTRY_TIMEZONE: Record<string, string> = {
  CO: 'America/Bogota',
  ES: 'Europe/Madrid',
  MX: 'America/Mexico_City',
  US: 'America/New_York',
  AR: 'America/Buenos_Aires',
  PE: 'America/Bogota',
  CL: 'America/Santiago',
};

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const values: Record<string, number> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });
  return values as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function zonedLocalToUtc(
  value: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0));
  const actualParts = getZonedParts(utcGuess, timeZone);
  const desiredAsUtc = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, 0, 0);
  const actualAsUtc = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second || 0,
    0
  );
  return new Date(utcGuess.getTime() + (desiredAsUtc - actualAsUtc));
}

function parseMonth(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2020 || month < 1 || month > 12) return null;
  return { year, month };
}

function monthLabel(year: number, month: number, locale = 'es-ES') {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1, 12, 0, 0))
  );
}

function monthBounds(year: number, month: number, timeZone: string) {
  const start = zonedLocalToUtc({ year, month, day: 1, hour: 0, minute: 0 }, timeZone);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = zonedLocalToUtc({ year: nextYear, month: nextMonth, day: 1, hour: 0, minute: 0 }, timeZone);
  return { start: start.toISOString(), end: end.toISOString() };
}

function statsFromOrders(args: {
  orders: any[];
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  locale: string;
}) {
  const stats = {
    periodYear: args.year,
    periodMonth: args.month,
    monthLabel: monthLabel(args.year, args.month, args.locale),
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    totalDeliveryFees: 0,
    deliveryOrderCount: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: args.orders.length,
    ordersCompleted: args.orders.length,
    ordersCancelled: 0,
  };

  args.orders.forEach((order) => {
    const total = Number(order.total) || 0;
    const tax = Number(order.tax ?? order.tax_amount) || 0;
    const discount = Number(order.discount_amount) || 0;
    const deliveryFee = Number(order.delivery_fee) || 0;

    if (order.payment_method === 'cash') {
      stats.cashSales += total;
    } else if (order.payment_method === 'stripe' || order.payment_method === 'card' || order.payment_method === 'wompi') {
      stats.cardSales += total;
    } else {
      stats.otherSales += total;
    }

    stats.totalSales += total;
    stats.totalTax += tax;
    stats.totalDiscount += discount;
    stats.totalDeliveryFees += deliveryFee;

    if (order.delivery_type === 'delivery' || deliveryFee > 0) {
      stats.deliveryOrderCount++;
    }
    if (order.status === 'cancelled') {
      stats.ordersCancelled++;
    }
  });

  return stats;
}

async function getMonthlyStats(tenantId: string, monthParam: string | null) {
  const parsedMonth = parseMonth(monthParam);
  if (!parsedMonth) {
    return { error: NextResponse.json({ error: 'Mes invalido. Usa formato YYYY-MM.' }, { status: 400 }) };
  }

  const supabase = createServiceClient();
  const { data: settings, error: settingsError } = await supabase
    .from('restaurant_settings')
    .select('display_name, phone, country, timezone, default_receipt_printer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (settingsError) {
    return { error: NextResponse.json({ error: settingsError.message }, { status: 500 }) };
  }

  const country = String(settings?.country || 'CO').toUpperCase();
  const timeZone = settings?.timezone || COUNTRY_TIMEZONE[country] || 'America/Bogota';
  const locale = country === 'CO' ? 'es-CO' : country === 'MX' ? 'es-MX' : 'es-ES';
  const bounds = monthBounds(parsedMonth.year, parsedMonth.month, timeZone);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total, tax, delivery_fee, delivery_type, payment_method, payment_status, status, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', bounds.start)
    .lt('created_at', bounds.end)
    .eq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .not('payment_method', 'is', null)
    .order('created_at', { ascending: true })
    .limit(5000);

  if (ordersError) {
    return { error: NextResponse.json({ error: ordersError.message }, { status: 500 }) };
  }

  return {
    supabase,
    settings,
    locale,
    stats: statsFromOrders({
      orders: orders || [],
      year: parsedMonth.year,
      month: parsedMonth.month,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      locale,
    }),
  };
}

function isMissingMonthlyTable(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('monthly_closings');
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');
  const month = request.nextUrl.searchParams.get('month');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });
    const result = await getMonthlyStats(tenantId, month);
    if ('error' in result) return result.error;

    const { data: closings, error: closingsError } = await result.supabase
      .from('monthly_closings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(24);

    return NextResponse.json({
      stats: result.stats,
      restaurant: {
        displayName: result.settings?.display_name || 'Restaurante',
        phone: result.settings?.phone || null,
        defaultReceiptPrinterId: result.settings?.default_receipt_printer_id || null,
      },
      closings: closingsError && isMissingMonthlyTable(closingsError) ? [] : (closings || []),
      needsMigration: Boolean(closingsError && isMissingMonthlyTable(closingsError)),
    });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { tenantId, month, staffName = 'Administrador', notes = '' } = body;

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
  }

  try {
    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true });
    const result = await getMonthlyStats(tenantId, month);
    if ('error' in result) return result.error;

    const row = {
      tenant_id: tenantId,
      period_year: result.stats.periodYear,
      period_month: result.stats.periodMonth,
      period_start: result.stats.periodStart,
      period_end: result.stats.periodEnd,
      staff_name: String(staffName || access.role || 'Administrador'),
      cash_sales: result.stats.cashSales,
      card_sales: result.stats.cardSales,
      other_sales: result.stats.otherSales,
      total_sales: result.stats.totalSales,
      total_delivery_fees: result.stats.totalDeliveryFees,
      delivery_order_count: result.stats.deliveryOrderCount,
      total_tax: result.stats.totalTax,
      total_discount: result.stats.totalDiscount,
      transaction_count: result.stats.transactionCount,
      orders_completed: result.stats.ordersCompleted,
      orders_cancelled: result.stats.ordersCancelled,
      notes: notes ? String(notes) : null,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: closing, error: closingError } = await result.supabase
      .from('monthly_closings')
      .upsert(row, { onConflict: 'tenant_id,period_year,period_month' })
      .select()
      .single();

    if (closingError) {
      if (isMissingMonthlyTable(closingError)) {
        return NextResponse.json(
          { error: 'Falta crear la tabla monthly_closings en Supabase.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: closingError.message }, { status: 500 });
    }

    return NextResponse.json({ closing, stats: result.stats });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
