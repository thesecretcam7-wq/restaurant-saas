import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time';
import type { createServiceClient } from '@/lib/supabase/server';

export type CashClosingMode = 'current' | 'pending';

export type CashClosingOrder = {
  id: string;
  order_number?: string | null;
  total: number;
  payment_method?: string | null;
  payment_breakdown?: any[] | null;
  created_at?: string | null;
};

export interface CashClosingStats {
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalDeliveryFees: number;
  deliveryOrderCount: number;
  totalTax: number;
  totalDiscount: number;
  transactionCount: number;
  ordersCompleted: number;
  ordersCancelled: number;
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
  closingOrders: CashClosingOrder[];
}

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
};

const ORDER_SELECT = 'id, order_number, total, tax, delivery_fee, delivery_type, payment_method, payment_breakdown, payment_status, status, created_at';

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

function isCountableClosingOrder(order: any) {
  return !isCancelledOrder(order) && isPaidOrder(order);
}

function normalizePaymentBreakdown(order: any) {
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

function addPaymentTotals(stats: CashClosingStats, order: any) {
  normalizePaymentBreakdown(order).forEach((payment: { method: string; amount: number }) => {
    if (payment.method === 'cash') {
      stats.cashSales += payment.amount;
    } else if (payment.method === 'stripe' || payment.method === 'card' || payment.method === 'wompi') {
      stats.cardSales += payment.amount;
    } else {
      stats.otherSales += payment.amount;
    }
  });
}

function emptyStats(period: CashClosingPeriod): CashClosingStats {
  return {
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    totalDeliveryFees: 0,
    deliveryOrderCount: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: 0,
    ordersCompleted: 0,
    ordersCancelled: 0,
    closingOrders: [],
    ...period,
  };
}

function statsFromOrders(period: CashClosingPeriod, orders: any[] = []): CashClosingStats {
  const countableOrders = orders.filter(isCountableClosingOrder);

  const stats: CashClosingStats = {
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
    closingOrders: countableOrders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      payment_method: order.payment_method,
      payment_breakdown: Array.isArray(order.payment_breakdown) ? order.payment_breakdown : null,
      created_at: order.created_at,
    })),
    ...period,
  };

  orders.forEach((order: any) => {
    if (isCancelledOrder(order)) {
      stats.ordersCancelled++;
      return;
    }
    if (!isPaidOrder(order)) return;

    const total = Number(order.total) || 0;
    const deliveryFee = Number(order.delivery_fee || 0);
    const tax = Number(order.tax) || 0;
    const discount = Number(order.discount_amount) || 0;

    addPaymentTotals(stats, order);
    stats.totalSales += total;
    stats.totalDeliveryFees += deliveryFee;
    if (deliveryFee > 0 || order.delivery_type === 'delivery') {
      stats.deliveryOrderCount++;
    }
    stats.totalTax += tax;
    stats.totalDiscount += discount;
  });

  return stats;
}

function isMissingDeliveryClosingColumns(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return (
    error?.code === 'PGRST204' &&
    (text.includes('total_delivery_fees') || text.includes('delivery_order_count'))
  );
}

async function getCurrentOperationalPeriod(supabase: SupabaseServiceClient, tenantId: string) {
  const { data: settings, error } = await supabase
    .from('restaurant_settings')
    .select('operating_hours, timezone, country')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;

  const timeZone = getRestaurantTimeZone({
    timezone: settings?.timezone,
    settingsCountry: settings?.country,
  });
  const locale = getRestaurantLocale(settings?.country);

  return getRestaurantBusinessPeriod({
    operatingHours: settings?.operating_hours,
    timeZone,
    locale,
  });
}

async function getClosedOrderIds(supabase: SupabaseServiceClient, tenantId: string, orderIds?: string[]) {
  if (orderIds && orderIds.length === 0) return new Set<string>();

  let query = supabase
    .from('cash_closing_items')
    .select('order_id')
    .eq('tenant_id', tenantId)
    .not('order_id', 'is', null)
    .limit(5000);

  if (orderIds) query = query.in('order_id', orderIds);

  const { data, error } = await query;
  if (error) {
    console.warn('No se pudieron consultar items de cierres anteriores:', error.message || error);
    return new Set<string>();
  }

  return new Set((data || []).map((item: any) => item.order_id).filter(Boolean));
}

export async function calculateCurrentCashClosingStats(
  supabase: SupabaseServiceClient,
  tenantId: string
): Promise<CashClosingStats> {
  const period = await getCurrentOperationalPeriod(supabase, tenantId);
  const startDate = new Date(period.periodStart);
  const endDate = new Date(period.periodEnd);

  const { data: orders, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .not('payment_method', 'is', null)
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error) throw error;

  const orderRows = orders || [];
  const closedOrderIds = await getClosedOrderIds(
    supabase,
    tenantId,
    orderRows.map((order: any) => order.id).filter(Boolean)
  );
  const openOrders = orderRows.filter((order: any) => {
    if (closedOrderIds.has(order.id)) return false;
    return true;
  });

  if (openOrders.length === 0) return emptyStats(period);
  return statsFromOrders(period, openOrders);
}

export async function calculatePendingPreviousCashClosingStats(
  supabase: SupabaseServiceClient,
  tenantId: string
): Promise<CashClosingStats | null> {
  const currentPeriod = await getCurrentOperationalPeriod(supabase, tenantId);
  const currentPeriodStart = new Date(currentPeriod.periodStart);
  const closingMoment = new Date();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('tenant_id', tenantId)
    .lte('created_at', closingMoment.toISOString())
    .not('payment_method', 'is', null)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: true })
    .limit(2000);

  if (error) throw error;
  if (!orders?.length) return null;

  const closedOrderIds = await getClosedOrderIds(supabase, tenantId);
  const pendingOrders = orders.filter((order: any) => {
    if (isCancelledOrder(order)) return false;
    if (closedOrderIds.has(order.id)) return false;
    return true;
  });

  if (pendingOrders.length === 0) return null;
  const hasPreviousPeriodOrders = pendingOrders.some((order: any) =>
    new Date(order.created_at) < currentPeriodStart
  );
  if (!hasPreviousPeriodOrders) return null;

  const firstOrderDate = new Date(pendingOrders[0].created_at);
  const period: CashClosingPeriod = {
    periodStart: firstOrderDate.toISOString(),
    periodEnd: closingMoment.toISOString(),
    businessDateLabel: `pendiente hasta ${currentPeriodStart.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })}`,
    operationalCloseTime: currentPeriod.operationalCloseTime,
  };

  return statsFromOrders(period, pendingOrders);
}

export async function calculateCashClosingStatsByMode(
  supabase: SupabaseServiceClient,
  tenantId: string,
  mode: CashClosingMode
) {
  return mode === 'pending'
    ? calculatePendingPreviousCashClosingStats(supabase, tenantId)
    : calculateCurrentCashClosingStats(supabase, tenantId);
}

export async function saveCashClosingWithServiceClient(
  supabase: SupabaseServiceClient,
  tenantId: string,
  staffId: string | null,
  staffName: string,
  closingData: CashClosingStats & {
    actualCashCount: number;
    notes: string;
  }
) {
  const expectedTotal = closingData.cashSales;
  const difference = expectedTotal - closingData.actualCashCount;
  const periodNote = `Periodo operativo: ${new Date(closingData.periodStart).toLocaleString('es-ES')} - ${new Date(closingData.periodEnd).toLocaleString('es-ES')}`;
  const notes = closingData.notes ? `${periodNote}\n${closingData.notes}` : periodNote;
  const normalizedStaffId = staffId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId)
    ? staffId
    : null;

  const baseClosing = {
    tenant_id: tenantId,
    staff_id: normalizedStaffId,
    staff_name: staffName || 'Sin asignar',
    cash_sales: closingData.cashSales,
    card_sales: closingData.cardSales,
    other_sales: closingData.otherSales,
    total_sales: closingData.totalSales,
    total_tax: closingData.totalTax,
    total_discount: closingData.totalDiscount,
    expected_total: expectedTotal,
    actual_cash_count: closingData.actualCashCount,
    difference,
    is_balanced: Math.abs(difference) < 0.01,
    transaction_count: closingData.transactionCount,
    orders_completed: closingData.ordersCompleted,
    orders_cancelled: closingData.ordersCancelled,
    notes,
    closed_at: new Date().toISOString(),
  };

  const insertClosing = (includeDeliveryTotals: boolean) =>
    supabase
      .from('cash_closings')
      .insert({
        ...baseClosing,
        ...(includeDeliveryTotals
          ? {
              total_delivery_fees: Number(closingData.totalDeliveryFees) || 0,
              delivery_order_count: Number(closingData.deliveryOrderCount) || 0,
            }
          : {}),
      })
      .select()
      .single();

  let result = await insertClosing(true);
  if (result.error && isMissingDeliveryClosingColumns(result.error)) {
    result = await insertClosing(false);
  }

  const { data, error } = result;
  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar el cierre de caja.');

  if (closingData.closingOrders?.length) {
    const { error: itemsError } = await supabase
      .from('cash_closing_items')
      .insert(closingData.closingOrders.map(order => ({
        cash_closing_id: data.id,
        tenant_id: tenantId,
        order_id: order.id,
        order_number: order.order_number || null,
        amount: order.total,
        payment_method: order.payment_method || null,
        created_at: order.created_at || new Date().toISOString(),
      })));

    if (itemsError) throw itemsError;
  }

  return data;
}
