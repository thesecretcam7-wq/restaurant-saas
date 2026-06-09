import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { getRestaurantBusinessPeriod, getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    const tableNumber = request.nextUrl.searchParams.get('tableNumber')

    if (!tenantId || !tableNumber) {
      return NextResponse.json({ error: 'tenantId and tableNumber are required' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero'] })

    const table = Number(tableNumber)
    if (!Number.isFinite(table)) {
      return NextResponse.json({ error: 'Invalid tableNumber' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const [{ data: tenant, error: tenantError }, { data: settings, error: settingsError }] = await Promise.all([
      supabase
        .from('tenants')
        .select('country')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase
        .from('restaurant_settings')
        .select('operating_hours, timezone, country')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
    ])

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }
    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    const timeZone = getRestaurantTimeZone({
      timezone: settings?.timezone,
      settingsCountry: settings?.country,
      tenantCountry: tenant?.country,
    })
    const locale = getRestaurantLocale(settings?.country || tenant?.country)
    const currentPeriod = getRestaurantBusinessPeriod({
      operatingHours: settings?.operating_hours,
      timeZone,
      locale,
    })

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, display_number, table_number, waiter_name, subtotal, tax, total, created_at, items, payment_status, status, delivery_type')
      .eq('tenant_id', tenantId)
      .eq('delivery_type', 'dine-in')
      .eq('table_number', table)
      .or('payment_status.is.null,payment_status.eq.pending')
      .neq('status', 'cancelled')
      .gt('total', 0)
      .gte('created_at', currentPeriod.periodStart)
      .lt('created_at', currentPeriod.periodEnd)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      orders: data || [],
      period: {
        start: currentPeriod.periodStart,
        end: currentPeriod.periodEnd,
        label: currentPeriod.businessDateLabel,
      },
    })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }
}
