import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant ID from domain
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get unique customers from orders with aggregated stats
    const { data: orders, error } = await supabase
      .from('orders')
      .select('customer_name, customer_email, customer_phone, total, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Aggregate customer data
    const customerMap = new Map<string, any>()

    orders?.forEach(order => {
      const key = order.customer_phone // Use phone as unique identifier
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: key,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
          orders_count: 0,
          total_spent: 0,
          last_order_date: null,
          created_at: order.created_at,
        })
      }

      const customer = customerMap.get(key)
      customer.orders_count += 1
      customer.total_spent += order.total
      if (!customer.last_order_date || new Date(order.created_at) > new Date(customer.last_order_date)) {
        customer.last_order_date = order.created_at
      }
    })

    const customers = Array.from(customerMap.values())
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))

    return NextResponse.json({ customers })
  } catch (err) {
    console.error('Customers GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
