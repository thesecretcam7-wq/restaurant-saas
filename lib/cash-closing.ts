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
  const startDate = fromDate || new Date(new Date().setHours(0, 0, 0, 0));
  const endDate = toDate || new Date();

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .neq('payment_method', null);

    if (error) {
      console.error('Error fetching orders:', error);
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
      };
    }

    const stats = {
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      totalTax: 0,
      totalDiscount: 0,
      transactionCount: orders?.length || 0,
      ordersCompleted: 0,
      ordersCancelled: 0,
    };

    orders?.forEach((order: any) => {
      const total = Number(order.total) || 0;
      const tax = Number(order.tax_amount) || 0;
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
      if (order.status === 'cancelled') {
        stats.ordersCancelled++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error calculating cash closing stats:', error);
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
    };
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

  const expectedTotal = closingData.cashSales + closingData.totalTax - closingData.totalDiscount;
  const difference = expectedTotal - closingData.actualCashCount;

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
        notes: closingData.notes,
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
