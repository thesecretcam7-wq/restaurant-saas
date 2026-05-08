import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrdersLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'

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

  const supabase = createServiceClient()
  const safeQuery = query.replace(/[,%]/g, '').trim()

  if (!safeQuery && queryDigits.length < 3) {
    return NextResponse.json({ error: 'Formato invalido' }, { status: 400 })
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .or(`id.eq.${tenantId},slug.eq.${tenantId}`)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  const filters = safeQuery
    ? [
        `order_number.ilike.%${safeQuery}%`,
        `customer_phone.ilike.%${safeQuery}%`,
      ]
    : []

  if (queryDigits.length >= 3) {
    filters.push(`order_number.ilike.%${queryDigits}%`)
    filters.push(`customer_phone.ilike.%${queryDigits}%`)
    if (queryDigits.length > 7) filters.push(`customer_phone.ilike.%${queryDigits.slice(-7)}%`)
  }

  const { data: rawOrders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, items, total, created_at, delivery_type, payment_method, customer_phone')
    .eq('tenant_id', tenant.id)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.error('Orders track error:', error)
    return NextResponse.json({ error: 'Error al buscar pedidos' }, { status: 500 })
  }

  const queryLower = safeQuery.toLowerCase()
  const orders = (rawOrders || []).filter((order: any) => {
    const phoneDigits = String(order.customer_phone || '').replace(/\D/g, '')
    const orderNumber = String(order.order_number || '').toLowerCase()
    return (
      orderNumber.includes(queryLower) ||
      (queryDigits.length >= 3 && orderNumber.includes(queryDigits.toLowerCase())) ||
      (queryDigits.length >= 3 && (
        phoneDigits.includes(queryDigits) ||
        phoneDigits.endsWith(queryDigits.slice(-7))
      ))
    )
  }).slice(0, 10).map(({ customer_phone, ...order }: any) => order)

  return NextResponse.json({ orders })
}
