import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getAiLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit';

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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get last 30 days of orders by hour
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders } = await supabase
      .from('orders')
      .select('created_at, total')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Aggregate by hour of day
    const hourlyStats: Record<number, { count: number; revenue: number }> = {};

    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { count: 0, revenue: 0 };
    }

    orders?.forEach((order: any) => {
      const hour = new Date(order.created_at).getHours();
      hourlyStats[hour].count++;
      hourlyStats[hour].revenue += Number(order.total);
    });

    // Calculate averages and predictions
    const forecast = Object.entries(hourlyStats).map(([hour, stats]) => {
      const avgOrders = stats.count > 0 ? Math.round(stats.count / 30) : 0;
      const avgRevenue = stats.count > 0 ? (stats.revenue / 30).toFixed(2) : '0.00';

      // Simple trend: predict if demand will increase (based on historical patterns)
      const trend = avgOrders > 3 ? 'high' : avgOrders > 1 ? 'medium' : 'low';

      return {
        hour: parseInt(hour),
        predictedOrders: avgOrders,
        predictedRevenue: parseFloat(avgRevenue as string),
        demandTrend: trend,
        recommendedStaff: Math.max(1, Math.ceil(avgOrders / 5)),
      };
    });

    // Find peak hours
    const peakHours = forecast
      .sort((a, b) => b.predictedOrders - a.predictedOrders)
      .slice(0, 3);

    return NextResponse.json({
      forecast,
      peakHours,
      insights: {
        avgOrdersPerDay: Math.round(
          Object.values(hourlyStats).reduce((sum, h) => sum + h.count, 0) / 30
        ),
        avgRevenuePerDay: (
          Object.values(hourlyStats).reduce((sum, h) => sum + h.revenue, 0) / 30
        ).toFixed(2),
        bestHours: peakHours.map((h) => `${h.hour}:00`).join(', '),
      },
    });
  } catch (error) {
    console.error('Error generating demand forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
