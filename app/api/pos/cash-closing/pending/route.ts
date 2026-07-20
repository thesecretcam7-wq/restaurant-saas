import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { isPendingPreviousCashClosingOrder } from '@/lib/cash-closing-filters';

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
};

const DEFAULT_OPERATIONAL_CLOSE_MINUTES = 5 * 60;
const ORDER_SELECT = 'id, order_number, total, tax, delivery_fee, delivery_type, payment_method, payment_breakdown, payment_status, status, created_at';
const ORDER_SELECT_WITHOUT_PAYMENT_BREAKDOWN = 'id, order_number, total, tax, delivery_fee, delivery_type, payment_method, payment_status, status, created_at';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const COUNTRY_TIMEZONE: Record<string, string> = {
  CO: 'America/Bogota',
  ES: 'Europe/Madrid',
  MX: 'America/Mexico_City',
  US: 'America/New_York',
  AR: 'America/Buenos_Aires',
  PE: 'America/Bogota',
  CL: 'America/Santiago',
};

function parseTimeToMinutes(value?: string | null) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function findOperationalCloseMinutes(operatingHours: any) {
  const overnightCloseMinutes: number[] = [];

  Object.values(operatingHours || {}).forEach((day: any) => {
    Object.values(day || {}).forEach((shift: any) => {
      const open = parseTimeToMinutes(shift?.open);
      const close = parseTimeToMinutes(shift?.close);
      if (open === null || close === null) return;
      if (close <= open) overnightCloseMinutes.push(close);
    });
  });

  if (overnightCloseMinutes.length === 0) return DEFAULT_OPERATIONAL_CLOSE_MINUTES;
  return Math.max(...overnightCloseMinutes);
}

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

function calculateBusinessPeriod(closeMinutes: number, timeZone: string, now = new Date()): CashClosingPeriod {
  const currentParts = getZonedParts(now, timeZone);
  const currentMinutes = currentParts.hour * 60 + currentParts.minute;
  const localBusinessDate = new Date(Date.UTC(currentParts.year, currentParts.month - 1, currentParts.day, 12, 0, 0, 0));

  if (currentMinutes < closeMinutes) {
    localBusinessDate.setUTCDate(localBusinessDate.getUTCDate() - 1);
  }

  const closeHour = Math.floor(closeMinutes / 60);
  const closeMinute = closeMinutes % 60;
  const start = zonedLocalToUtc(
    {
      year: localBusinessDate.getUTCFullYear(),
      month: localBusinessDate.getUTCMonth() + 1,
      day: localBusinessDate.getUTCDate(),
      hour: closeHour,
      minute: closeMinute,
    },
    timeZone
  );

  const localEndDate = new Date(localBusinessDate);
  localEndDate.setUTCDate(localEndDate.getUTCDate() + 1);
  const end = zonedLocalToUtc(
    {
      year: localEndDate.getUTCFullYear(),
      month: localEndDate.getUTCMonth() + 1,
      day: localEndDate.getUTCDate(),
      hour: closeHour,
      minute: closeMinute,
    },
    timeZone
  );

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    businessDateLabel: start.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      timeZone,
    }),
    operationalCloseTime: formatMinutes(closeMinutes),
  };
}

function isMissingPaymentBreakdownColumn(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('payment_breakdown') && (error?.code === '42703' || error?.code === 'PGRST204');
}

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205';
}

async function getOpenBillPayments(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data, error } = await supabase
    .from('cash_bill_payments')
    .select('id, supplier_name, concept, invoice_number, amount, staff_name, paid_at, notes')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('cash_closing_id', null)
    .gte('paid_at', periodStart)
    .lt('paid_at', periodEnd)
    .order('paid_at', { ascending: true })
    .limit(500);

  if (error) {
    if (isMissingBillPaymentsTable(error)) return [];
    throw error;
  }

  return data || [];
}

function statsFromOrders(period: CashClosingPeriod, orders: any[] = [], billPayments: any[] = []) {
  const countableOrders = orders.filter((order: any) =>
    !['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'].includes(String(order?.status || '').trim().toLowerCase()) &&
    String(order?.payment_status || '').trim().toLowerCase() === 'paid'
  );
  const normalizedBillPayments = billPayments.map((payment: any) => ({
    id: payment.id,
    supplier_name: payment.supplier_name,
    concept: payment.concept,
    invoice_number: payment.invoice_number,
    amount: Number(payment.amount) || 0,
    staff_name: payment.staff_name,
    paid_at: payment.paid_at,
    notes: payment.notes,
  }));

  const paymentRowsForOrder = (order: any) => {
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
  };

  const stats = {
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    billPaymentsTotal: normalizedBillPayments.reduce((sum, payment) => sum + payment.amount, 0),
    billPaymentsCount: normalizedBillPayments.length,
    totalDeliveryFees: 0,
    deliveryOrderCount: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: countableOrders.length,
    ordersCompleted: countableOrders.length,
    ordersCancelled: 0,
    closingOrders: countableOrders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      payment_method: order.payment_method,
      payment_breakdown: Array.isArray(order.payment_breakdown) ? order.payment_breakdown : null,
      created_at: order.created_at,
    })),
    billPayments: normalizedBillPayments,
    ...period,
  };

  orders.forEach((order: any) => {
    if (['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'].includes(String(order?.status || '').trim().toLowerCase())) {
      stats.ordersCancelled++;
      return;
    }
    if (String(order?.payment_status || '').trim().toLowerCase() !== 'paid') return;

    const total = Number(order.total) || 0;
    const tax = Number(order.tax ?? order.tax_amount) || 0;
    const discount = Number(order.discount_amount) || 0;
    const deliveryFee = Number(order.delivery_fee) || 0;

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
    stats.totalDeliveryFees += deliveryFee;
    if (deliveryFee > 0) {
      stats.deliveryOrderCount++;
    }
    stats.totalTax += tax;
    stats.totalDiscount += discount;

  });

  return stats;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });

    const supabase = createServiceClient();

    const { data: settings, error: settingsError } = await supabase
      .from('restaurant_settings')
      .select('operating_hours, timezone, country')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const timeZone = settings?.timezone || COUNTRY_TIMEZONE[String(settings?.country || 'CO').toUpperCase()] || 'America/Bogota';
    const currentPeriod = calculateBusinessPeriod(findOperationalCloseMinutes(settings?.operating_hours), timeZone);
    const currentPeriodStart = new Date(currentPeriod.periodStart);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - ONE_DAY_MS);

    const buildOrdersQuery = (select: string) => supabase
      .from('orders')
      .select(select)
      .eq('tenant_id', tenantId)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', currentPeriodStart.toISOString())
      .not('payment_method', 'is', null)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true })
      .limit(1000);

    const [initialOrdersRes, closedItemsRes] = await Promise.all([
      buildOrdersQuery(ORDER_SELECT),
      supabase
        .from('cash_closing_items')
        .select('order_id')
        .eq('tenant_id', tenantId)
        .not('order_id', 'is', null)
        .limit(2000),
    ]);

    let ordersRes = initialOrdersRes;
    if (ordersRes.error && isMissingPaymentBreakdownColumn(ordersRes.error)) {
      ordersRes = await buildOrdersQuery(ORDER_SELECT_WITHOUT_PAYMENT_BREAKDOWN);
    }

    if (ordersRes.error) {
      return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });
    }

    const orders: any[] = ordersRes.data || [];
    if (orders.length === 0) {
      return NextResponse.json({ stats: null });
    }

    const closedOrderIds = new Set((closedItemsRes.error ? [] : closedItemsRes.data || []).map((item: any) => item.order_id));
    const pendingOrders = orders.filter((order: any) => {
      return isPendingPreviousCashClosingOrder(order, currentPeriodStart, closedOrderIds);
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ stats: null });
    }

    const period: CashClosingPeriod = {
      periodStart: previousPeriodStart.toISOString(),
      periodEnd: currentPeriodStart.toISOString(),
      businessDateLabel: `dia anterior pendiente hasta ${currentPeriodStart.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        timeZone,
      })}`,
      operationalCloseTime: currentPeriod.operationalCloseTime,
    };

    const billPayments = await getOpenBillPayments(supabase, tenantId, period.periodStart, period.periodEnd);

    return NextResponse.json({ stats: statsFromOrders(period, pendingOrders, billPayments) });
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
