import { createClient } from '@/lib/supabase/client';

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
  closingOrders: {
    id: string;
    order_number?: string | null;
    total: number;
    payment_method?: string | null;
    created_at?: string | null;
  }[];
}

const DEFAULT_OPERATIONAL_CLOSE_MINUTES = 5 * 60; // 05:00, useful for restaurants that close after midnight.

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

type CashClosingPeriod = {
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
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

function calculateBusinessPeriod(closeMinutes: number, now = new Date()): CashClosingPeriod {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = new Date(now);
  start.setHours(Math.floor(closeMinutes / 60), closeMinutes % 60, 0, 0);

  if (currentMinutes < closeMinutes) {
    start.setDate(start.getDate() - 1);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    businessDateLabel: start.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }),
    operationalCloseTime: formatMinutes(closeMinutes),
  };
}

function statsFromOrders(period: CashClosingPeriod, orders: any[] = []): CashClosingStats {
  const countableOrders = orders.filter((order: any) =>
    order.status !== 'cancelled' && order.payment_status === 'paid'
  );

  const stats = {
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    totalDeliveryFees: 0,
    deliveryOrderCount: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: countableOrders.length,
    ordersCompleted: 0,
    ordersCancelled: 0,
    closingOrders: countableOrders.map((order: any) => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      payment_method: order.payment_method,
      created_at: order.created_at,
    })),
    ...period,
  };

  orders.forEach((order: any) => {
    if (order.status === 'cancelled') {
      stats.ordersCancelled++;
      return;
    }
    if (order.payment_status !== 'paid') return;

    const total = Number(order.total) || 0;
    const deliveryFee = Number(order.delivery_fee || 0);
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
    stats.totalDeliveryFees += deliveryFee;
    if (deliveryFee > 0 || order.delivery_type === 'delivery') {
      stats.deliveryOrderCount++;
    }
    stats.totalTax += tax;
    stats.totalDiscount += discount;

    if (order.status === 'delivered' || order.status === 'completed') {
      stats.ordersCompleted++;
    }
  });

  return stats;
}

async function getCurrentOperationalPeriod(tenantId: string) {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('operating_hours')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  return calculateBusinessPeriod(findOperationalCloseMinutes(settings?.operating_hours));
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
      .select('operating_hours')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const period = fromDate && toDate
      ? {
          periodStart: fromDate.toISOString(),
          periodEnd: toDate.toISOString(),
          businessDateLabel: fromDate.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' }),
          operationalCloseTime: 'manual',
        }
      : calculateBusinessPeriod(findOperationalCloseMinutes(settings?.operating_hours));

    const startDate = fromDate || new Date(period.periodStart);
    const endDate = toDate || new Date(period.periodEnd);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .neq('payment_method', null);

    if (error) {
      console.error('Error fetching orders:', error);
      return emptyStats(period);
    }

    const countableOrders = (orders || []).filter((order: any) =>
      order.status !== 'cancelled' && order.payment_status === 'paid'
    );

    const stats = {
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      totalDeliveryFees: 0,
      deliveryOrderCount: 0,
      totalTax: 0,
      totalDiscount: 0,
      transactionCount: countableOrders.length,
      ordersCompleted: 0,
      ordersCancelled: 0,
      closingOrders: countableOrders.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        total: Number(order.total) || 0,
        payment_method: order.payment_method,
        created_at: order.created_at,
      })),
      ...period,
    };

    orders?.forEach((order: any) => {
      if (order.status === 'cancelled') {
        stats.ordersCancelled++;
        return;
      }
      if (order.payment_status !== 'paid') return;

      const total = Number(order.total) || 0;
      const deliveryFee = Number(order.delivery_fee || 0);
      const tax = Number(order.tax ?? order.tax_amount) || 0;
      const discount = Number(order.discount_amount) || 0;

      // Desglose por método de pago
      if (order.payment_method === 'cash') {
        stats.cashSales += total;
      } else if (order.payment_method === 'stripe' || order.payment_method === 'card' || order.payment_method === 'wompi') {
        stats.cardSales += total;
      } else {
        stats.otherSales += total;
      }

      stats.totalSales += total;
      stats.totalDeliveryFees += deliveryFee;
      if (deliveryFee > 0 || order.delivery_type === 'delivery') {
        stats.deliveryOrderCount++;
      }
      stats.totalTax += tax;
      stats.totalDiscount += discount;

      if (order.status === 'delivered' || order.status === 'completed') {
        stats.ordersCompleted++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error calculating cash closing stats:', error);
    return emptyStats(calculateBusinessPeriod(DEFAULT_OPERATIONAL_CLOSE_MINUTES));
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
      .neq('payment_method', null)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
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

    return statsFromOrders(period, pendingOrders);
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

  const expectedTotal = closingData.cashSales;
  const difference = expectedTotal - closingData.actualCashCount;
  const periodNote = `Periodo operativo: ${new Date(closingData.periodStart).toLocaleString('es-ES')} - ${new Date(closingData.periodEnd).toLocaleString('es-ES')}`;
  const notes = closingData.notes ? `${periodNote}\n${closingData.notes}` : periodNote;

  try {
    const { data, error } = await supabase
      .from('cash_closings')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving cash closing:', error);
      throw error;
    }

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
