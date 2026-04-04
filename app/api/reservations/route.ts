import { createServiceClient } from '@/lib/supabase/server'
import { checkFeature } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Get tenant ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    let query = supabase
      .from('reservations')
      .select('*, tables(name)')
      .eq('tenant_id', tenant.id)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })

    if (date) {
      query = query.eq('reservation_date', date)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: reservations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reservations: reservations || [] })
  } catch (err) {
    console.error('Reservations GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, domain, customerName, customerEmail, customerPhone, partySize, reservationDate, reservationTime, notes } = body

    // Determine which ID to use
    const idToUse = tenantId

    if (!idToUse) {
      return NextResponse.json({ error: 'tenantId or domain required' }, { status: 400 })
    }

    // Plan check: reservations feature
    const featureCheck = await checkFeature(idToUse, 'reservations')
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: featureCheck.reason, upgradeRequired: true }, { status: 403 })
    }

    const supabase = await createServiceClient()

    // Find available table
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('tenant_id', idToUse)
      .gte('capacity', partySize)
      .order('capacity', { ascending: true })

    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: 'No tables available for this party size' }, { status: 400 })
    }

    let tableId = tables[0].id

    // Check table availability at this time
    const reservationDateTime = new Date(`${reservationDate}T${reservationTime}`)
    const oneHourLater = new Date(reservationDateTime.getTime() + 60 * 60 * 1000)

    const { data: conflicts } = await supabase
      .from('reservations')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'confirmed')
      .gte('reservation_date', reservationDate)
      .lte('reservation_date', reservationDate)
      .gte('reservation_time', reservationTime)
      .lt('reservation_time', oneHourLater.toISOString().split('T')[1])

    if (conflicts && conflicts.length > 0) {
      // Try next available table
      for (const table of tables.slice(1)) {
        const { data: tableConflicts } = await supabase
          .from('reservations')
          .select('*')
          .eq('table_id', table.id)
          .eq('status', 'confirmed')
          .eq('reservation_date', reservationDate)

        if (!tableConflicts || tableConflicts.length === 0) {
          tableId = table.id
          break
        }
      }
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        tenant_id: idToUse,
        table_id: tableId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        party_size: partySize,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (err) {
    console.error('Reservations POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
