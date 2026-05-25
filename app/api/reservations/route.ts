import { createServiceClient } from '@/lib/supabase/server'
import { checkFeature } from '@/lib/checkPlan'
import { NextRequest, NextResponse } from 'next/server'
import { sendReservationConfirmation } from '@/lib/email'
import { reservationLimiter, checkRateLimit, getClientIp } from '@/lib/ratelimit'
import { deriveBrandPalette } from '@/lib/brand-colors'

async function resolveTenantId(supabase: ReturnType<typeof createServiceClient>, slugOrId: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(slugOrId)) return slugOrId

  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slugOrId)
    .maybeSingle()

  return data?.id || null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

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
    const ip = getClientIp(request)
    const rl = await checkRateLimit(reservationLimiter, ip)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }, { status: 429 })
    }

    const body = await request.json()
    const { tenantId, domain, customerName, customerEmail, customerPhone, partySize, reservationDate, reservationTime, notes } = body

    if (!tenantId && !domain) {
      return NextResponse.json({ error: 'tenantId or domain required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const idToUse = await resolveTenantId(supabase, tenantId || domain)

    if (!idToUse) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    // Plan check: reservations feature
    const featureCheck = await checkFeature(idToUse, 'reservations')
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: featureCheck.reason, upgradeRequired: true }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('reservations_enabled, total_tables, seats_per_table')
      .eq('tenant_id', idToUse)
      .maybeSingle()

    if (!settings?.reservations_enabled) {
      return NextResponse.json({ error: 'Este restaurante no tiene reservas habilitadas' }, { status: 503 })
    }

    const totalCapacity = Number(settings.total_tables || 0) * Number(settings.seats_per_table || 0)
    if (totalCapacity > 0 && Number(partySize) > totalCapacity) {
      return NextResponse.json({ error: 'La cantidad de personas supera la capacidad configurada del restaurante' }, { status: 400 })
    }

    // Find available table when the restaurant has individual tables configured.
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('tenant_id', idToUse)
      .gte('seats', partySize)
      .order('seats', { ascending: true })

    if (tablesError) console.error('Tables lookup error:', tablesError)

    let tableId = tables?.[0]?.id || null

    // Check table availability at this time
    const reservationDateTime = new Date(`${reservationDate}T${reservationTime}`)
    const oneHourLater = new Date(reservationDateTime.getTime() + 60 * 60 * 1000)

    if (tableId && tables && tables.length > 0) {
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

    // Send confirmation email (non-blocking)
    if (customerEmail) {
      const { data: branding } = await supabase
        .from('tenant_branding')
        .select('app_name, primary_color')
        .eq('tenant_id', idToUse)
        .maybeSingle()
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('organization_name')
        .eq('id', idToUse)
        .maybeSingle()
      const { data: rs } = await supabase
        .from('restaurant_settings')
        .select('phone, address')
        .eq('tenant_id', idToUse)
        .maybeSingle()

      sendReservationConfirmation(customerEmail, {
        restaurantName: branding?.app_name || tenantRow?.organization_name || 'Restaurante',
        primaryColor: deriveBrandPalette().buttonPrimary,
        customerName,
        partySize,
        reservationDate,
        reservationTime,
        notes: notes || undefined,
        restaurantPhone: rs?.phone || undefined,
        restaurantAddress: rs?.address || undefined,
      }).catch(e => console.error('[email] reservation confirmation:', e))
    }

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (err) {
    console.error('Reservations POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
