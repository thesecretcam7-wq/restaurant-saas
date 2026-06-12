import { NextRequest, NextResponse } from 'next/server';
import { getAiLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { createServiceClient } from '@/lib/supabase/server';

function getQty(item: any) {
  const qty = Number(item?.qty ?? item?.quantity ?? 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function addItemStat(
  stats: Record<string, { quantity: number; revenue: number; name: string }>,
  item: any
) {
  const name = String(item?.name || '').trim();
  if (!name) return;
  const quantity = getQty(item);
  const price = Number(item?.price || 0);
  if (!stats[name]) stats[name] = { name, quantity: 0, revenue: 0 };
  stats[name].quantity += quantity;
  stats[name].revenue += price * quantity;
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
  const customerId = searchParams.get('customerId');
  let type = searchParams.get('type') || 'popular'; // popular, personalized, trending

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });
    const supabase = createServiceClient();

    if (type === 'personalized' && customerId) {
      // Get customer's previous orders
      const { data: orders } = await supabase
        .from('orders')
        .select('items')
        .eq('tenant_id', tenantId)
        .eq('customer_id', customerId)
        .limit(10);

      // Extract product names from orders
      const productNames = new Set<string>();
      orders?.forEach((order: any) => {
        if (order.items) {
          (Array.isArray(order.items) ? order.items : [order.items]).forEach((item: any) => {
            productNames.add(item.name);
          });
        }
      });

      if (productNames.size === 0) {
        // Fall back to popular items
        type = 'popular';
      } else {
        // Get similar products or category recommendations
        const { data: products } = await supabase
          .from('menu_items')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('available', true)
          .limit(5);

        return NextResponse.json({
          type: 'personalized',
          message: 'Based on your previous orders',
          recommendations: products || [],
        });
      }
    }

    if (type === 'popular') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('items, total, created_at, payment_status, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (ordersError) throw ordersError;

      const itemStats: Record<string, { quantity: number; revenue: number; name: string }> = {};

      orders?.forEach((order: any) => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((item: any) => addItemStat(itemStats, item));
      });

      const popular = Object.values(itemStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
          action: index === 0
            ? 'Ponlo primero en carta QR y úsalo como ancla de combo.'
            : index === 1
              ? 'Combínalo con el producto líder para subir ticket medio.'
              : 'Mantenlo visible y revisa stock antes del pico.',
        }));

      return NextResponse.json({
        type: 'popular',
        message: 'Productos con ventas reales de los ultimos 30 dias',
        recommendations: popular,
      });
    }

    if (type === 'trending') {
      // Get items with increasing sales trend
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentOrderItems } = await supabase
        .from('order_items')
        .select('name, quantity')
        .eq('tenant_id', tenantId)
        .gte('created_at', sevenDaysAgo.toISOString());

      const trendingStats: Record<string, { quantity: number; trend: number; name: string }> = {};

      recentOrderItems?.forEach((item: any) => {
        if (!trendingStats[item.name]) {
          trendingStats[item.name] = { name: item.name, quantity: 0, trend: 0 };
        }
        trendingStats[item.name].quantity += item.quantity;
      });

      const trending = Object.values(trendingStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return NextResponse.json({
        type: 'trending',
        message: 'Trending now',
        recommendations: trending,
      });
    }

    return NextResponse.json({
      type: 'none',
      message: 'No recommendations available',
      recommendations: [],
    });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
