import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, TenantAuthError, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { getCurrencyByCountry } from '@/lib/currency'
import { getRestaurantBusinessPeriod, getRestaurantBusinessPeriodForDate, getRestaurantLocalDateKey, getRestaurantTimeZone, getRestaurantLocale } from '@/lib/restaurant-time'
import { fetchReviewTickets } from '@/lib/sales-review-server'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId') || '', date = request.nextUrl.searchParams.get('date') || ''
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(tenantId) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return NextResponse.json({ error: 'Restaurante o fecha no válidos.' },{ status:400,headers })
  }
  try {
    await requireTenantAccess(tenantId,{ staffRoles:['admin'],requireAdminPermission:true })
    const db = createServiceClient(), signal = AbortSignal.timeout(10000)
    const [tenant,settings] = await Promise.all([
      db.from('tenants').select('country').eq('id',tenantId).retry(false).abortSignal(signal).maybeSingle(),
      db.from('restaurant_settings').select('country,timezone,operating_hours').eq('tenant_id',tenantId).retry(false).abortSignal(signal).maybeSingle(),
    ])
    if (tenant.error || settings.error) throw tenant.error || settings.error
    if (!tenant.data) return NextResponse.json({ error:'Restaurante no encontrado.' },{ status:404,headers })
    const country = settings.data?.country || tenant.data.country || 'ES'
    const timeZone = getRestaurantTimeZone({ timezone:settings.data?.timezone,settingsCountry:country }), locale = getRestaurantLocale(country)
    const periodArgs = { operatingHours:settings.data?.operating_hours,timeZone,locale }
    const today = getRestaurantLocalDateKey(getRestaurantBusinessPeriod(periodArgs).periodStart,timeZone)
    const selected = date || today, period = getRestaurantBusinessPeriodForDate(selected,periodArgs)
    if (!period || selected > today) return NextResponse.json({ error:'Selecciona una jornada válida, actual o anterior.' },{ status:400,headers })
    const tickets = await fetchReviewTickets(db,tenantId,period.periodStart,period.periodEnd,signal)
    return NextResponse.json({ tenantId,date:selected,today,period,timeZone,locale,currency:getCurrencyByCountry(country).code,tickets,updatedAt:new Date().toISOString() },{ headers })
  } catch (error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({ error:'No se pudieron cargar todos los tickets de la jornada. Intenta actualizar de nuevo.' },{ status:503,headers })
  }
}
