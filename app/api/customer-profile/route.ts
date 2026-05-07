import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit, checkoutLimiter, getClientIp } from '@/lib/ratelimit'

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
  const tenantParam = request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('tenantSlug') || ''
  const phone = request.nextUrl.searchParams.get('phone') || ''
  const phoneDigits = digitsOnly(phone)

  if (!tenantParam || !phone) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 })
  }

  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return NextResponse.json({ found: false })
  }

  const rl = await checkRateLimit(checkoutLimiter, `customer-profile:${tenantParam}:${getClientIp(request)}`)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta mas tarde.' }, { status: 429 })
  }

  const supabase = createServiceClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantParam)
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUuid ? 'id' : 'slug', tenantParam)
    .maybeSingle()

  if (tenantError || !tenant?.id) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('customer_name, customer_email, customer_phone, delivery_address, delivery_type, created_at')
    .eq('tenant_id', tenant.id)
    .not('customer_phone', 'is', null)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    console.error('[customer-profile] lookup error:', error.message)
    return NextResponse.json({ error: 'Error buscando cliente' }, { status: 500 })
  }

  const match = (orders || []).find((order: any) => digitsOnly(String(order.customer_phone || '')) === phoneDigits)

  if (!match) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    customer: {
      name: match.customer_name || '',
      email: match.customer_email || '',
      phone,
      delivery_address: match.delivery_address || '',
      delivery_type: match.delivery_type || 'pickup',
    },
  })
}
