import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrdersLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const query = (request.nextUrl.searchParams.get('query') || request.nextUrl.searchParams.get('phone') || '').trim()

  if (!tenantId || !query) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 })
  }

  const queryDigits = query.replace(/\D/g, '')
  if (query.length < 3 || query.length > 32) {
    return NextResponse.json({ error: 'Formato invalido' }, { status: 400 })
  }

  const limiter = getOrdersLimiter()
  const ip = getClientIp(request)
  const { limited, headers } = await applyRateLimit(limiter, `track:${tenantId}:${ip}`)
  if (limited) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta mas tarde.' },
      { status: 429, headers }
    )
  }

  const safeQuery = query.replace(/[,%]/g, '').trim()

  if (!safeQuery && queryDigits.length < 3) {
    return NextResponse.json({ error: 'Formato invalido' }, { status: 400 })
  }

  const context = await getTenantContext(tenantId)
  const tenant = context.tenant

  if (!tenant?.id) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const since = new Date()
  since.setDate(since.getDate() - 120)

  const { data: rawOrders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, items, total, created_at, delivery_type, payment_method, customer_phone')
    .eq('tenant_id', tenant.id)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Orders track error:', error)
    return NextResponse.json({ error: 'Error al buscar pedidos' }, { status: 500 })
  }

  const queryLower = safeQuery.toLowerCase()
  const orders = (rawOrders || []).filter((order: any) => {
    const phoneDigits = String(order.customer_phone || '').replace(/\D/g, '')
    const orderNumber = String(order.order_number || '').toLowerCase()
    const lastSeven = queryDigits.slice(-7)
    return (
      orderNumber.includes(queryLower) ||
      (queryDigits.length >= 3 && orderNumber.includes(queryDigits.toLowerCase())) ||
      (queryDigits.length >= 3 && (
        phoneDigits.includes(queryDigits) ||
        (lastSeven.length >= 7 && phoneDigits.endsWith(lastSeven))
      ))
    )
  }).slice(0, 10).map(({ customer_phone, ...order }: any) => order)

  return NextResponse.json({ orders })
}
