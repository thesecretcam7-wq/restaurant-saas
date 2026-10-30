import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { getRestaurantLocalDateKey, getRestaurantTimeZone } from '@/lib/restaurant-time'
import { isProductSalesDate } from '@/lib/product-sales'
import { fetchDailyProductSales } from '@/lib/product-sales-server'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') || ''
  const date = request.nextUrl.searchParams.get('date') || ''
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(tenantId) || !isProductSalesDate(date)) {
    return NextResponse.json({ error: 'Restaurante o fecha no validos' }, { status: 400, headers })
  }
  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const supabase = createServiceClient()
    const signal = AbortSignal.timeout(8_000)
    const [tenant, settings] = await Promise.all([
      supabase.from('tenants').select('country').eq('id', tenantId).retry(false).abortSignal(signal).maybeSingle(),
      supabase.from('restaurant_settings').select('country, timezone').eq('tenant_id', tenantId).retry(false).abortSignal(signal).maybeSingle(),
    ])
    if (tenant.error) throw tenant.error
    if (settings.error) throw settings.error
    if (!tenant.data) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404, headers })
    const timeZone = getRestaurantTimeZone({ timezone: settings.data?.timezone, settingsCountry: settings.data?.country, tenantCountry: tenant.data.country })
    if (date > getRestaurantLocalDateKey(new Date(), timeZone)) {
      return NextResponse.json({ error: 'Selecciona hoy o una fecha anterior' }, { status: 400, headers })
    }
    const products = await fetchDailyProductSales(supabase, tenantId, date, timeZone, signal)
    return NextResponse.json({ date, products, updatedAt: new Date().toISOString() }, { headers })
  } catch (error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    console.error('[product sales]', error)
    return NextResponse.json({ error: 'No se pudieron cargar las ventas por producto. Intenta de nuevo.' }, { status: 503, headers })
  }
}
