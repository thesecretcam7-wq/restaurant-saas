import { NextRequest, NextResponse } from 'next/server';
import { getAiLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrencyByCountry } from '@/lib/currency';
import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time';
import { calculatePendingPreviousCashClosingStats } from '@/lib/cash-closing-server';

type OrderRow = {
  id: string;
  total: number | string | null;
  created_at: string;
  payment_status?: string | null;
  payment_method?: string | null;
  status?: string | null;
  delivery_type?: string | null;
  items?: any;
};

function getQty(item: any) {
  const qty = Number(item?.qty ?? item?.quantity ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function getOrderItemRows(order: OrderRow) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items
    .map((item: any) => ({
      name: String(item?.name || 'Producto').trim(),
      quantity: getQty(item),
      price: Number(item?.price || 0),
    }))
    .filter(item => item.name);
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function calcPct(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(request: NextRequest) {
  const aiLimiter = getAiLimiter()
  if (aiLimiter) {
    const ip = getClientIp(request)
    const { limited, headers } = await applyRateLimit(aiLimiter, `ai:${ip}`)
    if (limited) {
      return NextResponse.json(
        { error: 'Límite de solicitudes de IA alcanzado. Intenta más tarde.' },
        { status: 429, headers }
      )
    }
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });
    const supabase = createServiceClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('country, timezone, operating_hours')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    const currencyInfo = getCurrencyByCountry(settings?.country || 'ES');
    const timeZone = getRestaurantTimeZone({
      timezone: settings?.timezone,
      settingsCountry: settings?.country,
    });
    const locale = getRestaurantLocale(settings?.country);
    const currentPeriod = getRestaurantBusinessPeriod({
      operatingHours: settings?.operating_hours,
      timeZone,
      locale,
    });

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, created_at, total, payment_status, payment_method, status, delivery_type, items')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1200);

    if (ordersError) throw ordersError;

    const paidOrders = ((orders || []) as OrderRow[]).filter(order =>
      order.status !== 'cancelled' && order.payment_status === 'paid'
    );
    const pendingClosingStats = await calculatePendingPreviousCashClosingStats(supabase, tenantId);
    const openCashClosingOrderIds = new Set((pendingClosingStats?.closingOrders || []).map(order => order.id));
    const recentOrders = paidOrders.filter(order => new Date(order.created_at) >= sevenDaysAgo);
    const previousOrders = paidOrders.filter(order => {
      const date = new Date(order.created_at);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });
    const currentPeriodOrders = paidOrders.filter(order => {
      const date = new Date(order.created_at);
      return date >= new Date(currentPeriod.periodStart) && date < new Date(currentPeriod.periodEnd);
    });
    const turnOrders = pendingClosingStats
      ? paidOrders.filter(order => openCashClosingOrderIds.has(order.id))
      : currentPeriodOrders;

    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const recentRevenue = recentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const turnRevenue = pendingClosingStats
      ? pendingClosingStats.totalSales
      : turnOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const turnAvgTicket = turnOrders.length > 0 ? turnRevenue / turnOrders.length : 0;

    const hourlyStats: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { count: 0, revenue: 0 };
    }

    paidOrders.forEach((order) => {
      const hour = Number(new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(order.created_at)));
      hourlyStats[hour].count++;
      hourlyStats[hour].revenue += Number(order.total || 0);
    });

    const forecast = Object.entries(hourlyStats).map(([hour, stats]) => {
      const avgOrders = stats.count > 0 ? Math.round(stats.count / 30) : 0;
      const trend = avgOrders > 3 ? 'high' : avgOrders > 1 ? 'medium' : 'low';

      return {
        hour: parseInt(hour),
        predictedOrders: avgOrders,
        predictedRevenue: Math.round(stats.revenue / 30),
        demandTrend: trend,
        recommendedStaff: Math.max(1, Math.ceil(avgOrders / 5)),
      };
    });

    const peakHours = forecast
      .sort((a, b) => b.predictedOrders - a.predictedOrders)
      .slice(0, 3);

    const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
    recentOrders.forEach(order => {
      getOrderItemRows(order).forEach(item => {
        if (!productStats[item.name]) productStats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        productStats[item.name].quantity += item.quantity;
        productStats[item.name].revenue += item.price * item.quantity;
      });
    });
    const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const starProduct = topProducts[0];
    const comboProduct = topProducts[1];

    const paymentCounts = paidOrders.reduce((acc: Record<string, number>, order) => {
      const key = order.payment_method || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const paymentTotal = Math.max(paidOrders.length, 1);
    const cardShare = Math.round(((paymentCounts.stripe || 0) + (paymentCounts.card || 0) + (paymentCounts.wompi || 0)) / paymentTotal * 100);
    const deliveryCount = recentOrders.filter(order => order.delivery_type === 'delivery').length;
    const revenueDelta = calcPct(recentRevenue, previousRevenue);

    const advice = [
      starProduct && {
        title: `Empuja ${starProduct.name}`,
        text: `Vendio ${starProduct.quantity} unidades en los ultimos 7 dias. Ponlo primero en carta QR y usalo como producto ancla.`,
        priority: 'high',
      },
      starProduct && comboProduct && {
        title: 'Combo recomendado',
        text: `Prueba un combo ${starProduct.name} + ${comboProduct.name}. Son los productos con mas traccion real ahora mismo.`,
        priority: 'medium',
      },
      peakHours[0]?.predictedOrders > 0 && {
        title: `Refuerza cerca de ${formatHour(peakHours[0].hour)}`,
        text: `Es tu franja con mas demanda historica. Ten cocina, caja e ingredientes listos antes de ese pico.`,
        priority: 'high',
      },
      turnOrders.length > 0 && turnAvgTicket < avgTicket * 0.9 && {
        title: 'Sube el ticket medio hoy',
        text: `El ticket medio del turno va por debajo del promedio. Ofrece bebida, extra o acompanamiento antes de cobrar.`,
        priority: 'medium',
      },
      cardShare >= 50 && {
        title: 'Controla pagos con tarjeta',
        text: `${cardShare}% de ventas pagadas entran por tarjeta/digital. Revisa cierre separando efectivo y datáfono.`,
        priority: 'medium',
      },
      deliveryCount > 0 && {
        title: 'Domicilios con demanda',
        text: `${deliveryCount} pedidos delivery en 7 dias. Revisa zonas, tiempo de entrega y cobro de domicilio.`,
        priority: 'low',
      },
    ].filter(Boolean);

    return NextResponse.json({
      forecast,
      peakHours,
      currency: currencyInfo,
      advice,
      topProducts,
      insights: {
        ordersAnalyzed: paidOrders.length,
        last7Orders: recentOrders.length,
        todayOrders: turnOrders.length,
        todayRevenue: turnRevenue,
        turnScope: pendingClosingStats ? 'open_cash_closing' : 'current_period',
        turnLabel: pendingClosingStats ? 'Caja abierta pendiente' : 'Turno actual',
        avgOrdersPerDay: Math.round(paidOrders.length / 30),
        avgRevenuePerDay: Math.round(totalRevenue / 30),
        avgTicket: Math.round(avgTicket),
        todayAvgTicket: Math.round(turnAvgTicket),
        revenueDelta,
        bestHours: peakHours.map((h) => formatHour(h.hour)).join(', '),
        cardShare,
      },
    });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error generating demand forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
