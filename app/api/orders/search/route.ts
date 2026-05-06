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

      const rawSearch = orderNumber.trim()
      const searchTerm = `%${rawSearch}%`
      const onlyDigits = rawSearch.replace(/\D/g, '')
      const maybeTableNumber = Number(onlyDigits || rawSearch)

      let query = supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total, payment_status, status, items, created_at, delivery_type, table_number')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (/mesa/i.test(rawSearch) && Number.isFinite(maybeTableNumber)) {
        query = query.eq('table_number', maybeTableNumber)
      } else {
        const orFilters = [
          `order_number.ilike.${searchTerm}`,
          `customer_name.ilike.${searchTerm}`,
          `customer_phone.ilike.${searchTerm}`,
        ]

        if (onlyDigits.length >= 3) {
          orFilters.push(`order_number.ilike.%${onlyDigits}%`)
          orFilters.push(`customer_phone.ilike.%${onlyDigits}%`)
        }

        if (Number.isFinite(maybeTableNumber) && maybeTableNumber > 0 && maybeTableNumber <= 999) {
          orFilters.push(`table_number.eq.${maybeTableNumber}`)
        }

        query = query.or(orFilters.join(','))
      }

      const { data: orders, error } = await query

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
