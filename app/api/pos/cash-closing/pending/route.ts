import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
};

const DEFAULT_OPERATIONAL_CLOSE_MINUTES = 5 * 60;

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

function statsFromOrders(period: CashClosingPeriod, orders: any[] = []) {
  const stats = {
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: orders.length,
    ordersCompleted: 0,
    ordersCancelled: 0,
    closingOrders: orders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      payment_method: order.payment_method,
      created_at: order.created_at,
    })),
    ...period,
  };

  orders.forEach((order: any) => {
    const total = Number(order.total) || 0;
    const tax = Number(order.tax ?? order.tax_amount) || 0;
    const discount = Number(order.discount_amount) || 0;

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

    if (order.status === 'delivered' || order.status === 'completed') {
      stats.ordersCompleted++;
    }
  });

  return stats;
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
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

    const [ordersRes, closedItemsRes, latestClosingRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, total, tax, payment_method, payment_status, status, created_at')
        .eq('tenant_id', tenantId)
        .lt('created_at', currentPeriodStart.toISOString())
        .neq('payment_method', null)
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })
        .limit(1000),
      supabase
        .from('cash_closing_items')
        .select('order_id')
        .eq('tenant_id', tenantId)
        .not('order_id', 'is', null)
        .limit(2000),
      supabase
        .from('cash_closings')
        .select('closed_at')
        .eq('tenant_id', tenantId)
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError = ordersRes.error;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const orders = ordersRes.data || [];
    if (orders.length === 0) {
      return NextResponse.json({ stats: null });
    }

    const closedOrderIds = new Set((closedItemsRes.error ? [] : closedItemsRes.data || []).map((item: any) => item.order_id));
    const latestClosingDate = !latestClosingRes.error && latestClosingRes.data?.closed_at
      ? new Date(latestClosingRes.data.closed_at)
      : null;
    const pendingOrders = orders.filter((order: any) => {
      if (closedOrderIds.has(order.id)) return false;
      if (latestClosingDate && new Date(order.created_at) <= latestClosingDate) return false;
      return true;
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ stats: null });
    }

    const firstOrderDate = new Date(pendingOrders[0].created_at);
    const period: CashClosingPeriod = {
      periodStart: firstOrderDate.toISOString(),
      periodEnd: currentPeriodStart.toISOString(),
      businessDateLabel: `pendiente hasta ${currentPeriodStart.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        timeZone,
      })}`,
      operationalCloseTime: currentPeriod.operationalCloseTime,
    };

    return NextResponse.json({ stats: statsFromOrders(period, pendingOrders) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
