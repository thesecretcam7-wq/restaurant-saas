import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const period = (searchParams.get('period') || 'month') as 'week' | 'month' | 'year'

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    if (period === 'week') startDate.setDate(now.getDate() - 7)
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1)
    else startDate.setFullYear(now.getFullYear() - 1)

    // Get all orders
    const { data: allOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    const orders = allOrders || []

    // Get orders in period
    const ordersInPeriod = orders.filter(
      o => new Date(o.created_at) >= startDate && new Date(o.created_at) <= now
    )

    // Calculate KPIs
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const paidOrders = orders.filter(o => o.payment_status === 'paid').length
    const pendingPayments = orders
      .filter(o => o.payment_status === 'pending')
      .reduce((sum, o) => sum + (o.total || 0), 0)

    const ordersThisMonth = ordersInPeriod.length
    const revenueThisMonth = ordersInPeriod.reduce((sum, o) => sum + (o.total || 0), 0)

    // Build daily sales data
    const dailySalesMap = new Map<string, { sales: number; orders: number }>()
    ordersInPeriod.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      if (!dailySalesMap.has(date)) {
        dailySalesMap.set(date, { sales: 0, orders: 0 })
      }
      const current = dailySalesMap.get(date)!
      current.sales += order.total || 0
      current.orders += 1
    })

    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get top products
    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    ordersInPeriod.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.id || item.name
          if (!productSalesMap.has(key)) {
            productSalesMap.set(key, { name: item.name, quantity: 0, revenue: 0 })
          }
          const current = productSalesMap.get(key)!
          current.quantity += item.qty || 1
          current.revenue += (item.price || 0) * (item.qty || 1)
        })
      }
    })

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return NextResponse.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      paidOrders,
      pendingPayments,
      ordersThisMonth,
      revenueThisMonth,
      dailySales,
      topProducts,
    })
  } catch (err) {
    console.error('Analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
