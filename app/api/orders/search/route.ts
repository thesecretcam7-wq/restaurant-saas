import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const orderNumber = searchParams.get('order_number')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!domain || !orderNumber) {
      return NextResponse.json(
        { error: 'Domain and order_number are required' },
        { status: 400 }
      )
    }

    // SECURITY: Verify user owns the tenant
    const { verifyTenantOwnership } = await import('@/lib/auth-helpers')
    try {
      const { tenantId } = await verifyTenantOwnership(request, domain)

      const supabase = createServiceClient()

      // Search by order_number (case-insensitive, ilike for partial matches)
      const searchTerm = `%${orderNumber}%`

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total, payment_status, status, items, created_at, delivery_type, table_number')
        .eq('tenant_id', tenantId)
        .ilike('order_number', searchTerm)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ orders: orders || [] })
    } catch (authError) {
      const { sendErrorResponse } = await import('@/lib/auth-helpers')
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500
      return sendErrorResponse(authError, statusCode)
    }
  } catch (err) {
    console.error('Order search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
