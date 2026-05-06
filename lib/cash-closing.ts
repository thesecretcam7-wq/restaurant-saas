import { createClient } from '@/lib/supabase/client';

export interface CashClosingStats {
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  totalTax: number;
  totalDiscount: number;
  transactionCount: number;
  ordersCompleted: number;
  ordersCancelled: number;
  periodStart: string;
  periodEnd: string;
  businessDateLabel: string;
  operationalCloseTime: string;
}

const DEFAULT_OPERATIONAL_CLOSE_MINUTES = 5 * 60; // 05:00, useful for restaurants that close after midnight.

function emptyStats(period: CashClosingPeriod): CashClosingStats {
  return {
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalSales: 0,
    totalTax: 0,
    totalDiscount: 0,
    transactionCount: 0,
    ordersCompleted: 0,
    ordersCancelled: 0,
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

    const countableOrders = (orders || []).filter((order: any) => order.status !== 'cancelled');

    const stats = {
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      totalTax: 0,
      totalDiscount: 0,
      transactionCount: countableOrders.length,
      ordersCompleted: 0,
      ordersCancelled: 0,
      ...period,
    };

    orders?.forEach((order: any) => {
      if (order.status === 'cancelled') {
        stats.ordersCancelled++;
        return;
      }

      const total = Number(order.total) || 0;
      const tax = Number(order.tax ?? order.tax_amount) || 0;
      const discount = Number(order.discount_amount) || 0;

      // Desglose por método de pago
      if (order.payment_method === 'cash') {
        stats.cashSales += total;
      } else if (order.payment_method === 'stripe' || order.payment_method === 'card') {
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
  } catch (error) {
    console.error('Error calculating cash closing stats:', error);
    return emptyStats(calculateBusinessPeriod(DEFAULT_OPERATIONAL_CLOSE_MINUTES));
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
