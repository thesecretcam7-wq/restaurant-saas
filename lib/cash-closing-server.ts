import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time';
import {
  isCancelledCashClosingOrder,
  isCountableCashClosingOrder,
  isPaidCashClosingOrder,
  isPendingPreviousCashClosingOrder,
} from '@/lib/cash-closing-filters';
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

export type CashBillPayment = {
  id: string;
  supplier_name: string;
  concept?: string | null;
  invoice_number?: string | null;
  amount: number;
  staff_name?: string | null;
  paid_at?: string | null;
  notes?: string | null;
};

export interface CashClosingStats {
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  billPaymentsTotal: number;
  billPaymentsCount: number;
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
  billPayments: CashBillPayment[];
}

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
};

const ORDER_SELECT = 'id, order_number, total, tax, delivery_fee, delivery_type, payment_method, payment_breakdown, payment_status, status, created_at';
const ORDER_SELECT_WITHOUT_PAYMENT_BREAKDOWN = 'id, order_number, total, tax, delivery_fee, delivery_type, payment_method, payment_status, status, created_at';
const CASH_CLOSING_QUERY_TIMEOUT_MS = 8_000;
const CLOSED_ORDER_ID_PAGE_SIZE = 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isCancelledOrder(order: any) {
  return isCancelledCashClosingOrder(order);
}

function isPaidOrder(order: any) {
  return isPaidCashClosingOrder(order);
}

function isCountableClosingOrder(order: any) {
  return isCountableCashClosingOrder(order);
}

async function runCashClosingQuery<T>(query: any, label: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CASH_CLOSING_QUERY_TIMEOUT_MS);

  try {
    return await query.abortSignal(controller.signal);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.toLowerCase().includes('abort'))
    ) {
      throw new Error(`${label} tardó demasiado. Intenta de nuevo en unos segundos.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
    billPaymentsTotal: 0,
    billPaymentsCount: 0,
    totalDeliveryFees: 0,
    deliveryOrderCount: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: 0,
    ordersCompleted: 0,
    ordersCancelled: 0,
    closingOrders: [],
    billPayments: [],
    ...period,
  };
}

function statsFromOrders(period: CashClosingPeriod, orders: any[] = [], billPayments: any[] = []): CashClosingStats {
  const countableOrders = orders.filter(isCountableClosingOrder);
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

  const stats: CashClosingStats = {
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
    if (deliveryFee > 0) {
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

function isMissingPaymentBreakdownColumn(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('payment_breakdown') && (error?.code === '42703' || error?.code === 'PGRST204');
}

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205';
}

async function getCurrentOperationalPeriod(supabase: SupabaseServiceClient, tenantId: string) {
  const { data: settings, error } = await runCashClosingQuery<{
    data: { operating_hours?: any; timezone?: string | null; country?: string | null } | null;
    error: any;
  }>(
    supabase
      .from('restaurant_settings')
      .select('operating_hours, timezone, country')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    'La configuración del restaurante'
  );

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

export async function getCurrentCashClosingPeriodWithServiceClient(
  supabase: SupabaseServiceClient,
  tenantId: string
) {
  return getCurrentOperationalPeriod(supabase, tenantId);
}

async function getClosedOrderIds(supabase: SupabaseServiceClient, tenantId: string, orderIds?: string[]) {
  if (orderIds && orderIds.length === 0) return new Set<string>();
  const targetOrderIds = orderIds ? new Set(orderIds.filter(Boolean)) : null;
  const closedOrderIds = new Set<string>();

  for (let from = 0; ; from += CLOSED_ORDER_ID_PAGE_SIZE) {
    const { data, error } = await runCashClosingQuery<{ data: any[] | null; error: any }>(
      supabase
        .from('cash_closing_items')
        .select('order_id')
        .eq('tenant_id', tenantId)
        .not('order_id', 'is', null)
        .range(from, from + CLOSED_ORDER_ID_PAGE_SIZE - 1),
      'La consulta de pedidos ya cerrados'
    );

    if (error) {
      console.warn('No se pudieron consultar items de cierres anteriores:', error.message || error);
      return closedOrderIds;
    }

    const rows = data || [];
    rows.forEach((item: any) => {
      const orderId = item?.order_id;
      if (orderId && (!targetOrderIds || targetOrderIds.has(orderId))) {
        closedOrderIds.add(orderId);
      }
    });

    if (rows.length < CLOSED_ORDER_ID_PAGE_SIZE) break;
  }

  return closedOrderIds;
}

async function getOpenBillPayments(
  supabase: SupabaseServiceClient,
  tenantId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data, error } = await runCashClosingQuery<{ data: any[] | null; error: any }>(
    supabase
      .from('cash_bill_payments')
      .select('id, supplier_name, concept, invoice_number, amount, staff_name, paid_at, notes')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('cash_closing_id', null)
      .gte('paid_at', periodStart)
      .lt('paid_at', periodEnd)
      .order('paid_at', { ascending: true })
      .limit(500),
    'La consulta de pagos de facturas'
  );

  if (error) {
    if (isMissingBillPaymentsTable(error)) return [];
    throw error;
  }

  return data || [];
}

async function getLatestCashClosingDate(supabase: SupabaseServiceClient, tenantId: string) {
  const { data, error } = await runCashClosingQuery<{ data: { closed_at?: string | null } | null; error: any }>(
    supabase
      .from('cash_closings')
      .select('closed_at')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'La consulta del ultimo cierre de caja'
  );

  if (error) {
    console.warn('No se pudo consultar el ultimo cierre de caja:', error.message || error);
    return null;
  }

  if (!data?.closed_at) return null;
  const closingDate = new Date(data.closed_at);
  return Number.isNaN(closingDate.getTime()) ? null : closingDate;
}

export async function calculateCurrentCashClosingStats(
  supabase: SupabaseServiceClient,
  tenantId: string
): Promise<CashClosingStats> {
  const period = await getCurrentOperationalPeriod(supabase, tenantId);
  const endDate = new Date(period.periodEnd);
  const nominalStartDate = new Date(period.periodStart);
  const latestClosingDate = await getLatestCashClosingDate(supabase, tenantId);
  const startDate = latestClosingDate && latestClosingDate < endDate
    ? latestClosingDate
    : nominalStartDate;
  const effectivePeriod = startDate.getTime() === nominalStartDate.getTime()
    ? period
    : {
        ...period,
        periodStart: startDate.toISOString(),
        businessDateLabel: `desde ultimo cierre`,
      };

  const buildOrdersQuery = (select: string) => supabase
    .from('orders')
    .select(select)
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate.toISOString())
    .lt('created_at', endDate.toISOString())
    .not('payment_method', 'is', null)
    .order('created_at', { ascending: true })
    .limit(2000);

  let ordersResult = await runCashClosingQuery<{ data: any[] | null; error: any }>(
    buildOrdersQuery(ORDER_SELECT),
    'La consulta de ventas del cierre actual'
  );
  if (ordersResult.error && isMissingPaymentBreakdownColumn(ordersResult.error)) {
    ordersResult = await runCashClosingQuery<{ data: any[] | null; error: any }>(
      buildOrdersQuery(ORDER_SELECT_WITHOUT_PAYMENT_BREAKDOWN),
      'La consulta de ventas del cierre actual'
    );
  }

  if (ordersResult.error) throw ordersResult.error;

  const orderRows: any[] = ordersResult.data || [];
  const closedOrderIds = await getClosedOrderIds(
    supabase,
    tenantId,
    orderRows.map((order: any) => order.id).filter(Boolean)
  );
  const openOrders = orderRows.filter((order: any) => {
    if (closedOrderIds.has(order.id)) return false;
    return true;
  });

  const billPayments = await getOpenBillPayments(supabase, tenantId, effectivePeriod.periodStart, effectivePeriod.periodEnd);
  if (openOrders.length === 0 && billPayments.length === 0) return emptyStats(effectivePeriod);
  return statsFromOrders(effectivePeriod, openOrders, billPayments);
}

export async function calculatePendingPreviousCashClosingStats(
  supabase: SupabaseServiceClient,
  tenantId: string
): Promise<CashClosingStats | null> {
  const currentPeriod = await getCurrentOperationalPeriod(supabase, tenantId);
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
    .limit(2000);

  let ordersResult = await runCashClosingQuery<{ data: any[] | null; error: any }>(
    buildOrdersQuery(ORDER_SELECT),
    'La consulta de ventas pendientes'
  );
  if (ordersResult.error && isMissingPaymentBreakdownColumn(ordersResult.error)) {
    ordersResult = await runCashClosingQuery<{ data: any[] | null; error: any }>(
      buildOrdersQuery(ORDER_SELECT_WITHOUT_PAYMENT_BREAKDOWN),
      'La consulta de ventas pendientes'
    );
  }

  if (ordersResult.error) throw ordersResult.error;
  const orderRows: any[] = ordersResult.data || [];
  if (!orderRows.length) return null;

  const closedOrderIds = await getClosedOrderIds(
    supabase,
    tenantId,
    orderRows.map((order: any) => order.id).filter(Boolean)
  );
  const pendingOrders = orderRows.filter((order: any) => {
    return isPendingPreviousCashClosingOrder(order, currentPeriodStart, closedOrderIds);
  });

  if (pendingOrders.length === 0) return null;
  const period: CashClosingPeriod = {
    periodStart: previousPeriodStart.toISOString(),
    periodEnd: currentPeriodStart.toISOString(),
    businessDateLabel: `dia anterior pendiente hasta ${currentPeriodStart.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })}`,
    operationalCloseTime: currentPeriod.operationalCloseTime,
  };

  const billPayments = await getOpenBillPayments(supabase, tenantId, period.periodStart, period.periodEnd);
  return statsFromOrders(period, pendingOrders, billPayments);
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
  const expectedTotal = Math.max(0, closingData.cashSales - (Number(closingData.billPaymentsTotal) || 0));
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

  let result = await runCashClosingQuery<{ data: any; error: any }>(
    insertClosing(true),
    'El guardado del cierre de caja'
  );
  if (result.error && isMissingDeliveryClosingColumns(result.error)) {
    result = await runCashClosingQuery<{ data: any; error: any }>(
      insertClosing(false),
      'El guardado del cierre de caja'
    );
  }

  const { data, error } = result;
  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar el cierre de caja.');

  if (closingData.closingOrders?.length) {
    const { error: itemsError } = await runCashClosingQuery<{ data: any; error: any }>(
      supabase
        .from('cash_closing_items')
        .insert(closingData.closingOrders.map(order => ({
          cash_closing_id: data.id,
          tenant_id: tenantId,
          order_id: order.id,
          order_number: order.order_number || null,
          amount: order.total,
          payment_method: order.payment_method || null,
          created_at: order.created_at || new Date().toISOString(),
        }))),
      'El guardado de ventas del cierre'
    );

    if (itemsError) throw itemsError;
  }

  if (closingData.billPayments?.length) {
    const { error: billPaymentsError } = await runCashClosingQuery<{ data: any; error: any }>(
      supabase
        .from('cash_bill_payments')
        .update({ cash_closing_id: data.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .in('id', closingData.billPayments.map(payment => payment.id)),
      'La actualización de facturas del cierre'
    );

    if (billPaymentsError && !isMissingBillPaymentsTable(billPaymentsError)) throw billPaymentsError;
  }

  return data;
}
