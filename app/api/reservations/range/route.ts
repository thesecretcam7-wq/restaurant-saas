import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const domain = searchParams.get('domain')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!domain || !start || !end) {
      return NextResponse.json({ error: 'domain, start y end son requeridos' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .maybeSingle()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    }

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, customer_name, customer_email, customer_phone, party_size, reservation_date, reservation_time, status, notes')
      .eq('tenant_id', tenant.id)
      .gte('reservation_date', start)
      .lte('reservation_date', end)
      .order('reservation_date')
      .order('reservation_time')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reservations: reservations || [] })
  } catch (err) {
    console.error('[reservations/range GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
