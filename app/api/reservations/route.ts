import { createClient } from '@/lib/supabase/server'
import { checkFeature } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, customer_name, customer_email, customer_phone, party_size, reservation_date, reservation_time, notes } = body

    // Plan check: reservations feature
    const featureCheck = await checkFeature(tenantId, 'reservations')
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: featureCheck.reason, upgradeRequired: true }, { status: 403 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenantId,
        customer_name,
        customer_email,
        customer_phone,
        party_size,
        reservation_date,
        reservation_time,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
