import { createClient } from '@/lib/supabase/client';
import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time';

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
  billPayments: {
    id: string;
    supplier_name: string;
    concept?: string | null;
    invoice_number?: string | null;
    amount: number;
    staff_name?: string | null;
    paid_at?: string | null;
    notes?: string | null;
  }[];
  closingOrders: {
    id: string;
    order_number?: string | null;
    total: number;
    payment_method?: string | null;
    payment_breakdown?: any[] | null;
    created_at?: string | null;
  }[];
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

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
};

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
    if (isCancelledOrder(order)) {
      stats.ordersCancelled++;
      return;
    }
    if (!isPaidOrder(order)) return;

    const total = Number(order.total) || 0;
    const deliveryFee = Number(order.delivery_fee || 0);
    const tax = Number(order.tax ?? order.tax_amount) || 0;
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

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205';
}

async function getOpenBillPayments(tenantId: string, periodStart: string, periodEnd: string) {
  const supabase = createClient();
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

async function getCurrentOperationalPeriod(tenantId: string) {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('operating_hours, timezone, country')
    .eq('tenant_id', tenantId)
    .maybeSingle();

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

/**
 * Calculate cash closing statistics for a tenant
 * Gets all orders from today that are completed or paid
 */
export async function calculateCashClosingStats(
  tenantId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<CashClosingStats> {
  const supabase = createClient();

  try {
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('operating_hours, timezone, country')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const timeZone = getRestaurantTimeZone({
      timezone: settings?.timezone,
      settingsCountry: settings?.country,
    });
    const locale = getRestaurantLocale(settings?.country);
    const period = fromDate && toDate
      ? {
          periodStart: fromDate.toISOString(),
          periodEnd: toDate.toISOString(),
          businessDateLabel: fromDate.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', timeZone }),
          operationalCloseTime: 'manual',
        }
      : getRestaurantBusinessPeriod({
          operatingHours: settings?.operating_hours,
          timeZone,
          locale,
        });

    const startDate = fromDate || new Date(period.periodStart);
    const endDate = toDate || new Date(period.periodEnd);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString())
      .not('payment_method', 'is', null);

    const billPayments = await getOpenBillPayments(tenantId, period.periodStart, period.periodEnd);

    if (error) {
      console.error('Error fetching orders:', error);
      return statsFromOrders(period, [], billPayments);
    }

    const countableOrders = (orders || []).filter((order: any) =>
      isCountableClosingOrder(order)
    );

    const stats = {
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      billPaymentsTotal: billPayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0),
      billPaymentsCount: billPayments.length,
      totalDeliveryFees: 0,
      deliveryOrderCount: 0,
      totalTax: 0,
      totalDiscount: 0,
      transactionCount: countableOrders.length,
      ordersCompleted: countableOrders.length,
      ordersCancelled: 0,
      billPayments: billPayments.map((payment: any) => ({
        id: payment.id,
        supplier_name: payment.supplier_name,
        concept: payment.concept,
        invoice_number: payment.invoice_number,
        amount: Number(payment.amount) || 0,
        staff_name: payment.staff_name,
        paid_at: payment.paid_at,
        notes: payment.notes,
      })),
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

    orders?.forEach((order: any) => {
      if (isCancelledOrder(order)) {
        stats.ordersCancelled++;
        return;
      }
      if (!isPaidOrder(order)) return;

      const total = Number(order.total) || 0;
      const deliveryFee = Number(order.delivery_fee || 0);
      const tax = Number(order.tax ?? order.tax_amount) || 0;
      const discount = Number(order.discount_amount) || 0;

      // Desglose por método de pago
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
  } catch (error) {
    console.error('Error calculating cash closing stats:', error);
    return emptyStats(getRestaurantBusinessPeriod({
      timeZone: getRestaurantTimeZone(),
      locale: getRestaurantLocale(),
    }));
  }
}

export async function calculatePendingPreviousCashClosingStats(tenantId: string): Promise<CashClosingStats | null> {
  const supabase = createClient();

  try {
    const currentPeriod = await getCurrentOperationalPeriod(tenantId);
    const currentPeriodStart = new Date(currentPeriod.periodStart);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .lt('created_at', currentPeriodStart.toISOString())
      .not('payment_method', 'is', null)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: true })
      .limit(1000);

    if (error || !orders?.length) {
      if (error) {
        console.warn('No se pudieron consultar ventas pendientes de cierre:', error.message || error);
      }
      return null;
    }

    const { data: closedItems, error: closedItemsError } = await supabase
      .from('cash_closing_items')
      .select('order_id')
      .eq('tenant_id', tenantId)
      .not('order_id', 'is', null)
      .limit(2000);

    const { data: latestClosing, error: latestClosingError } = await supabase
      .from('cash_closings')
      .select('closed_at')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (closedItemsError) {
      console.warn('No se pudieron consultar items de cierres anteriores:', closedItemsError.message || closedItemsError);
    }

    if (latestClosingError) {
      console.warn('No se pudo consultar el ultimo cierre de caja:', latestClosingError.message || latestClosingError);
    }

    const closedOrderIds = new Set((closedItems || []).map((item: any) => item.order_id));
    const latestClosingDate = latestClosing?.closed_at ? new Date(latestClosing.closed_at) : null;
    const pendingOrders = orders.filter((order: any) => {
      if (isCancelledOrder(order)) return false;
      if (closedOrderIds.has(order.id)) return false;
      if (latestClosingDate && new Date(order.created_at) <= latestClosingDate) return false;
      return true;
    });

    if (pendingOrders.length === 0) return null;

    const firstOrderDate = new Date(pendingOrders[0].created_at);
    const period: CashClosingPeriod = {
      periodStart: firstOrderDate.toISOString(),
      periodEnd: currentPeriodStart.toISOString(),
      businessDateLabel: `pendiente hasta ${currentPeriodStart.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}`,
      operationalCloseTime: currentPeriod.operationalCloseTime,
    };

    const billPayments = await getOpenBillPayments(tenantId, period.periodStart, period.periodEnd);
    return statsFromOrders(period, pendingOrders, billPayments);
  } catch (error) {
    console.warn('No se pudo calcular cierres pendientes anteriores:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Save cash closing record to Supabase
 */
export async function saveCashClosing(
  tenantId: string,
  staffId: string | null,
  staffName: string,
  closingData: CashClosingStats & {
    actualCashCount: number;
    notes: string;
  }
) {
  const supabase = createClient();

  const expectedTotal = Math.max(0, closingData.cashSales - (Number(closingData.billPaymentsTotal) || 0));
  const difference = expectedTotal - closingData.actualCashCount;
  const periodNote = `Periodo operativo: ${new Date(closingData.periodStart).toLocaleString('es-ES')} - ${new Date(closingData.periodEnd).toLocaleString('es-ES')}`;
  const notes = closingData.notes ? `${periodNote}\n${closingData.notes}` : periodNote;

  try {
    const baseClosing = {
        tenant_id: tenantId,
        staff_id: staffId,
        staff_name: staffName,
        cash_sales: closingData.cashSales,
        card_sales: closingData.cardSales,
        other_sales: closingData.otherSales,
        total_sales: closingData.totalSales,
        total_tax: closingData.totalTax,
        total_discount: closingData.totalDiscount,
        expected_total: expectedTotal,
        actual_cash_count: closingData.actualCashCount,
        difference: difference,
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
      console.warn('Cash closing delivery columns are missing; save will continue without persisted delivery totals.');
      result = await insertClosing(false);
    }

    const { data, error } = result;

    if (error) {
      console.error('Error saving cash closing:', error);
      throw error;
    }
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

      if (itemsError) {
        console.error('Error saving cash closing items:', itemsError);
      }
    }

    if (closingData.billPayments?.length) {
      const { error: billPaymentsError } = await supabase
        .from('cash_bill_payments')
        .update({ cash_closing_id: data.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .in('id', closingData.billPayments.map(payment => payment.id));

      if (billPaymentsError && !isMissingBillPaymentsTable(billPaymentsError)) {
        console.error('Error saving bill payments in closing:', billPaymentsError);
      }
    }

    return data;
  } catch (error) {
    console.error('Error in saveCashClosing:', error);
    throw error;
  }
}

/**
 * Get cash closing history for a tenant
 */
export async function getCashClosingHistory(
  tenantId: string,
  limit = 30
) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('cash_closings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching cash closing history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCashClosingHistory:', error);
    return [];
  }
}

/**
 * Get cash closing by ID
 */
export async function getCashClosingById(closingId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('cash_closings')
      .select('*')
      .eq('id', closingId)
      .single();

    if (error) {
      console.error('Error fetching cash closing:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCashClosingById:', error);
    return null;
  }
}
