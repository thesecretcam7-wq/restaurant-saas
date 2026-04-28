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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const customerId = searchParams.get('customerId');
  let type = searchParams.get('type') || 'popular'; // popular, personalized, trending

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
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
      // Get most ordered items in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('name, quantity, price')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const itemStats: Record<string, { quantity: number; revenue: number; name: string }> = {};

      orderItems?.forEach((item: any) => {
        if (!itemStats[item.name]) {
          itemStats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
        }
        itemStats[item.name].quantity += item.quantity;
        itemStats[item.name].revenue += Number(item.price) * item.quantity;
      });

      const popular = Object.values(itemStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return NextResponse.json({
        type: 'popular',
        message: 'Most popular items',
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
    console.error('Error generating recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
