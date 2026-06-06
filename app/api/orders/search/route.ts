import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time'

const ORDER_FIELDS = 'id, order_number, customer_name, customer_phone, subtotal, tax, delivery_fee, total, payment_status, payment_method, status, items, created_at, delivery_type, table_number'

async function getPendingPreviousTicketScope({
  supabase,
  tenantId,
  currentPeriod,
  locale,
  timeZone,
  limit,
}: {
  supabase: ReturnType<typeof createServiceClient>
  tenantId: string
  currentPeriod: ReturnType<typeof getRestaurantBusinessPeriod>
  locale: string
  timeZone: string
  limit: number
}) {
  const currentPeriodStart = new Date(currentPeriod.periodStart)

  const [ordersRes, closedItemsRes, latestClosingRes] = await Promise.all([
    supabase
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('tenant_id', tenantId)
      .lt('created_at', currentPeriodStart.toISOString())
      .neq('payment_method', null)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('cash_closing_items')
      .select('order_id')
      .eq('tenant_id', tenantId)
      .not('order_id', 'is', null)
      .limit(2000),
    supabase
      .from('cash_closings')
      .select('closed_at')
      .eq('tenant_id', tenantId)
      .order('closed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (ordersRes.error) throw ordersRes.error

  if (closedItemsRes.error) {
    console.warn('No se pudieron consultar items de cierres anteriores:', closedItemsRes.error.message || closedItemsRes.error)
  }

  if (latestClosingRes.error) {
    console.warn('No se pudo consultar el ultimo cierre de caja:', latestClosingRes.error.message || latestClosingRes.error)
  }

  const closedOrderIds = new Set((closedItemsRes.error ? [] : closedItemsRes.data || []).map((item: any) => item.order_id))
  const latestClosingDate = !latestClosingRes.error && latestClosingRes.data?.closed_at
    ? new Date(latestClosingRes.data.closed_at)
    : null

  const pendingOrders = (ordersRes.data || []).filter((order: any) => {
    if (closedOrderIds.has(order.id)) return false
    if (latestClosingDate && new Date(order.created_at) <= latestClosingDate) return false
    return true
  })

  if (pendingOrders.length === 0) return null

  const earliestPendingOrder = pendingOrders[pendingOrders.length - 1]
  const pendingBusinessDate = new Date(currentPeriod.periodStart)
  pendingBusinessDate.setUTCMinutes(pendingBusinessDate.getUTCMinutes() - 1)

  return {
    orders: pendingOrders.slice(0, limit),
    count: pendingOrders.length,
    paidCount: pendingOrders.length,
    scope: 'pending_previous',
    label: 'Caja pendiente',
    period: {
      periodStart: earliestPendingOrder?.created_at || currentPeriod.periodStart,
      periodEnd: currentPeriod.periodStart,
      businessDateLabel: pendingBusinessDate.toLocaleDateString(locale, {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        timeZone,
      }),
      operationalCloseTime: currentPeriod.operationalCloseTime,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const orderNumber = searchParams.get('order_number')
    const todayOnly = searchParams.get('today') === '1'
    const requestedLimit = parseInt(searchParams.get('limit') || '10')
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 10

    if (!domain || (!orderNumber && !todayOnly)) {
      return NextResponse.json(
        { error: 'Domain and order_number are required' },
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
        .select('id, country')
        .or(tenantLookup)
        .maybeSingle()

      if (!tenant?.id) {
        return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
      }

      const tenantId = tenant.id
      await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] })

      const rawSearch = (orderNumber || '').trim()
      const searchTerm = `%${rawSearch}%`
      const onlyDigits = rawSearch.replace(/\D/g, '')
      const maybeTableNumber = Number(onlyDigits || rawSearch)
      let todayPeriod: ReturnType<typeof getRestaurantBusinessPeriod> | null = null
      const ticketScope = 'current_period'
      const ticketScopeLabel = 'Turno actual'

      if (todayOnly && !rawSearch) {
        const { data: settings, error: settingsError } = await supabase
          .from('restaurant_settings')
          .select('operating_hours, timezone, country')
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (settingsError) {
          return NextResponse.json({ error: settingsError.message }, { status: 500 })
        }

        const timeZone = getRestaurantTimeZone({
          timezone: settings?.timezone,
          settingsCountry: settings?.country,
          tenantCountry: tenant.country,
        })
        const locale = getRestaurantLocale(settings?.country || tenant.country)

        todayPeriod = getRestaurantBusinessPeriod({
          operatingHours: settings?.operating_hours,
          timeZone,
          locale,
        })

        const pendingPreviousScope = await getPendingPreviousTicketScope({
          supabase,
          tenantId,
          currentPeriod: todayPeriod,
          locale,
          timeZone,
          limit,
        })

        if (pendingPreviousScope) {
          return NextResponse.json(pendingPreviousScope)
        }
      }

      let query = todayPeriod
        ? supabase.from('orders').select(ORDER_FIELDS, { count: 'exact' })
        : supabase.from('orders').select(ORDER_FIELDS)

      query = query
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (todayPeriod) {
        query = query
          .gte('created_at', todayPeriod.periodStart)
          .lt('created_at', todayPeriod.periodEnd)
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

      const { data: orders, error, count } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let paidCount: number | null = null
      if (todayPeriod) {
        const { count: exactPaidCount, error: paidCountError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .gte('created_at', todayPeriod.periodStart)
          .lt('created_at', todayPeriod.periodEnd)
          .neq('payment_method', null)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')

        if (paidCountError) {
          return NextResponse.json({ error: paidCountError.message }, { status: 500 })
        }

        paidCount = exactPaidCount || 0
      }

      return NextResponse.json({
        orders: orders || [],
        count: count ?? orders?.length ?? 0,
        paidCount,
        scope: ticketScope,
        label: ticketScopeLabel,
        period: todayPeriod,
      })
    } catch (authError) {
      return tenantAuthErrorResponse(authError)
    }
  } catch (err) {
    console.error('Order search error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
