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

function localDateKey(dateValue: string | null | undefined, timeZone: string) {
  if (!dateValue) return 'sin-fecha';
  const parts = getZonedParts(new Date(dateValue), timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function localHour(dateValue: string | null | undefined, timeZone: string) {
  if (!dateValue) return 0;
  return getZonedParts(new Date(dateValue), timeZone).hour || 0;
}

function orderTypeLabel(type: string) {
  if (type === 'delivery') return 'Domicilio';
  if (type === 'pickup') return 'Para recoger';
  if (type === 'dine-in') return 'Salon / mesa';
  if (type === 'takeaway') return 'Para llevar';
  return type || 'Sin tipo';
}

function paymentMethodLabel(method: string) {
  if (method === 'cash') return 'Efectivo';
  if (method === 'stripe' || method === 'card') return 'Tarjeta';
  if (method === 'wompi') return 'Wompi';
  if (method === 'mixed') return 'Mixto';
  return method || 'Otro';
}

function getOrderItemQuantity(item: any) {
  const quantity = Number(item?.qty ?? item?.quantity ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

const CANCELLED_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado']);

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isCancelledOrder(order: any) {
  return CANCELLED_ORDER_STATUSES.has(normalizeStatus(order?.status));
}

function isPaidOrder(order: any) {
  return normalizeStatus(order?.payment_status) === 'paid';
}

function paymentRowsForOrder(order: any) {
  const total = Number(order?.total) || 0;
  const rows = Array.isArray(order?.payment_breakdown) ? order.payment_breakdown : [];
  const payments = rows
    .map((payment: any) => ({
      method: String(payment?.method || '').trim().toLowerCase(),
      amount: Number(payment?.amount) || 0,
    }))
    .filter((payment: { method: string; amount: number }) => payment.method && payment.amount > 0);

  if (payments.length > 0) return payments;
  if (!order?.payment_method || total <= 0) return [];
  return [{ method: String(order.payment_method).trim().toLowerCase(), amount: total }];
}

function statsFromOrders(args: {
  orders: any[];
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  locale: string;
  timeZone: string;
}) {
  const countableOrders = args.orders.filter((order) => !isCancelledOrder(order) && isPaidOrder(order));
  const productSalesMap = new Map<string, {
    menuItemId: string | null;
    name: string;
    quantity: number;
    revenue: number;
    orderCount: number;
  }>();
  const paymentBreakdownMap = new Map<string, { method: string; label: string; count: number; total: number }>();
  const orderTypeBreakdownMap = new Map<string, { type: string; label: string; count: number; total: number }>();
  const dailySalesMap = new Map<string, { date: string; orders: number; total: number }>();
  const hourlySalesMap = new Map<number, { hour: number; orders: number; total: number }>();
  let totalItemsSold = 0;
  let firstOrderAt: string | null = null;
  let lastOrderAt: string | null = null;

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
    transactionCount: countableOrders.length,
    ordersCompleted: countableOrders.length,
    ordersCancelled: 0,
    totalItemsSold: 0,
    averageTicket: 0,
    averageItemsPerOrder: 0,
    firstOrderAt: null as string | null,
    lastOrderAt: null as string | null,
    bestSalesDay: null as { date: string; orders: number; total: number } | null,
    peakHour: null as { hour: number; label: string; orders: number; total: number } | null,
    productSales: [] as Array<{
      menuItemId: string | null;
      name: string;
      quantity: number;
      revenue: number;
      orderCount: number;
    }>,
    paymentBreakdown: [] as Array<{ method: string; label: string; count: number; total: number }>,
    orderTypeBreakdown: [] as Array<{ type: string; label: string; count: number; total: number }>,
    dailySales: [] as Array<{ date: string; orders: number; total: number }>,
  };

  args.orders.forEach((order) => {
    if (isCancelledOrder(order)) {
      stats.ordersCancelled++;
    }
  });

  countableOrders.forEach((order) => {
    const total = Number(order.total) || 0;
    const tax = Number(order.tax ?? order.tax_amount) || 0;
    const discount = Number(order.discount_amount) || 0;
    const deliveryFee = Number(order.delivery_fee) || 0;
    const paymentMethod = String(order.payment_method || 'other');
    const orderType = String(order.delivery_type || 'takeaway');

    paymentRowsForOrder(order).forEach((payment: { method: string; amount: number }) => {
      if (payment.method === 'cash') {
        stats.cashSales += payment.amount;
      } else if (payment.method === 'stripe' || payment.method === 'card' || payment.method === 'wompi') {
        stats.cardSales += payment.amount;
      } else {
        stats.otherSales += payment.amount;
      }
    });

    stats.totalSales += total;
    stats.totalTax += tax;
    stats.totalDiscount += discount;
    stats.totalDeliveryFees += deliveryFee;

    if (order.delivery_type === 'delivery' || deliveryFee > 0) {
      stats.deliveryOrderCount++;
    }

    paymentRowsForOrder(order).forEach((payment: { method: string; amount: number }) => {
      const paymentSummary = paymentBreakdownMap.get(payment.method) || {
        method: payment.method,
        label: paymentMethodLabel(payment.method),
        count: 0,
        total: 0,
      };
      paymentSummary.count += 1;
      paymentSummary.total += payment.amount;
      paymentBreakdownMap.set(payment.method, paymentSummary);
    });

    const orderTypeSummary = orderTypeBreakdownMap.get(orderType) || {
      type: orderType,
      label: orderTypeLabel(orderType),
      count: 0,
      total: 0,
    };
    orderTypeSummary.count += 1;
    orderTypeSummary.total += total;
    orderTypeBreakdownMap.set(orderType, orderTypeSummary);

    const dateKey = localDateKey(order.created_at, args.timeZone);
    const dailySummary = dailySalesMap.get(dateKey) || { date: dateKey, orders: 0, total: 0 };
    dailySummary.orders += 1;
    dailySummary.total += total;
    dailySalesMap.set(dateKey, dailySummary);

    const hour = localHour(order.created_at, args.timeZone);
    const hourlySummary = hourlySalesMap.get(hour) || { hour, orders: 0, total: 0 };
    hourlySummary.orders += 1;
    hourlySummary.total += total;
    hourlySalesMap.set(hour, hourlySummary);

    if (order.created_at) {
      if (!firstOrderAt || new Date(order.created_at) < new Date(firstOrderAt)) firstOrderAt = order.created_at;
      if (!lastOrderAt || new Date(order.created_at) > new Date(lastOrderAt)) lastOrderAt = order.created_at;
    }

    if (Array.isArray(order.items)) {
      const orderProductKeys = new Set<string>();
      order.items.forEach((item: any) => {
        const quantity = getOrderItemQuantity(item);
        const price = Number(item?.price) || 0;
        const name = String(item?.name || 'Producto sin nombre').trim() || 'Producto sin nombre';
        const menuItemId = item?.menu_item_id || item?.item_id || item?.id || null;
        const key = menuItemId || name.toLowerCase();
        const current = productSalesMap.get(key) || {
          menuItemId,
          name,
          quantity: 0,
          revenue: 0,
          orderCount: 0,
        };
        current.quantity += quantity;
        current.revenue += price * quantity;
        if (!orderProductKeys.has(key)) {
          current.orderCount += 1;
          orderProductKeys.add(key);
        }
        productSalesMap.set(key, current);
        totalItemsSold += quantity;
      });
    }
  });

  const dailySales = Array.from(dailySalesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const peakHour = Array.from(hourlySalesMap.values()).sort((a, b) => b.total - a.total || b.orders - a.orders)[0] || null;

  stats.totalItemsSold = totalItemsSold;
  stats.averageTicket = stats.transactionCount > 0 ? stats.totalSales / stats.transactionCount : 0;
  stats.averageItemsPerOrder = stats.transactionCount > 0 ? totalItemsSold / stats.transactionCount : 0;
  stats.firstOrderAt = firstOrderAt;
  stats.lastOrderAt = lastOrderAt;
  stats.bestSalesDay = dailySales.slice().sort((a, b) => b.total - a.total || b.orders - a.orders)[0] || null;
  stats.peakHour = peakHour
    ? {
        ...peakHour,
        label: `${String(peakHour.hour).padStart(2, '0')}:00 - ${String((peakHour.hour + 1) % 24).padStart(2, '0')}:00`,
      }
    : null;
  stats.productSales = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name));
  stats.paymentBreakdown = Array.from(paymentBreakdownMap.values())
    .sort((a, b) => b.total - a.total || b.count - a.count);
  stats.orderTypeBreakdown = Array.from(orderTypeBreakdownMap.values())
    .sort((a, b) => b.total - a.total || b.count - a.count);
  stats.dailySales = dailySales;

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
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', bounds.start)
    .lt('created_at', bounds.end)
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
      timeZone,
    }),
  };
}

function isMissingMonthlyTable(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('monthly_closings');
}

function isMissingMonthlyReportDetailsColumn(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return error?.code === 'PGRST204' && text.includes('report_details');
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
      report_details: {
        totalItemsSold: result.stats.totalItemsSold,
        averageTicket: result.stats.averageTicket,
        averageItemsPerOrder: result.stats.averageItemsPerOrder,
        firstOrderAt: result.stats.firstOrderAt,
        lastOrderAt: result.stats.lastOrderAt,
        bestSalesDay: result.stats.bestSalesDay,
        peakHour: result.stats.peakHour,
        productSales: result.stats.productSales,
        paymentBreakdown: result.stats.paymentBreakdown,
        orderTypeBreakdown: result.stats.orderTypeBreakdown,
        dailySales: result.stats.dailySales,
      },
      notes: notes ? String(notes) : null,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const upsertMonthlyClosing = (includeReportDetails: boolean) => {
      const payload = includeReportDetails ? row : Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== 'report_details')
      );
      return result.supabase
        .from('monthly_closings')
        .upsert(payload, { onConflict: 'tenant_id,period_year,period_month' })
        .select()
        .single();
    };

    let upsertResult = await upsertMonthlyClosing(true);
    if (upsertResult.error && isMissingMonthlyReportDetailsColumn(upsertResult.error)) {
      upsertResult = await upsertMonthlyClosing(false);
    }

    const { data: closing, error: closingError } = upsertResult;

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
