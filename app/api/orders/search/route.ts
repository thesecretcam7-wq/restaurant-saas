import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const orderNumber = searchParams.get('order_number')
    const limit = parseInt(searchParams.get('limit') || '200')

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    try {
      const supabase = createServiceClient()
      const isTenantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(domain)
      const tenantLookup = isTenantUUID
        ? `id.eq.${domain},slug.eq.${domain}`
        : `slug.eq.${domain}`

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .or(tenantLookup)
        .maybeSingle()

      if (!tenant?.id) {
        return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
      }

      const tenantId = tenant.id
      await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] })

      const rawSearch = orderNumber?.trim() || ''
      const searchTerm = `%${rawSearch}%`
      const onlyDigits = rawSearch.replace(/\D/g, '')
      const maybeTableNumber = Number(onlyDigits || rawSearch)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      let query = supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, total, payment_status, status, items, created_at, delivery_type, table_number')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!rawSearch) {
        query = query
          .gte('created_at', todayStart.toISOString())
          .neq('status', 'cancelled')
      } else if (/mesa/i.test(rawSearch) && Number.isFinite(maybeTableNumber)) {
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
      return tenantAuthErrorResponse(authError)
    }
  } catch (err) {
    console.error('Order search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
