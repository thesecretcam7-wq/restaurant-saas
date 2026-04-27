import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrdersLimiter, getClientIp, applyRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  const phone = request.nextUrl.searchParams.get('phone')

  if (!tenantId || !phone) {
    return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
  }

  // SECURITY: Basic input validation
  const phoneDigits = phone.replace(/\D/g, '')
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
  }

  // SECURITY: Rate limiting to prevent phone number brute-forcing
  const limiter = getOrdersLimiter()
  const ip = getClientIp(request)
  const { limited, headers } = await applyRateLimit(limiter, `track:${tenantId}:${ip}`)
  if (limited) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429, headers }
    )
  }

  const supabase = createServiceClient()

  // SECURITY: Validate tenantId exists before querying orders
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
  }

  // NOTE: This endpoint allows unauthenticated access (customers need to track orders)
  // SECURITY RECOMMENDATION: Consider implementing:
  // 1. Rate limiting to prevent phone number brute-forcing
  // 2. Requiring order_number or verification code in addition to phone
  // 3. Limiting to orders created in last 30 days

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, status, items, total, created_at, delivery_type, payment_method')
    .eq('tenant_id', tenantId)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Orders track error:', error)
    return NextResponse.json({ error: 'Error al buscar pedidos' }, { status: 500 })
  }

  return NextResponse.json({ orders: orders || [] })
}
