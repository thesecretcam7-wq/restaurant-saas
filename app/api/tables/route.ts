import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

  const { data, error } = await sb()
    .from('tables')
    .select('id, table_number, seats, location, status')
    .eq('tenant_id', tenantId)
    .order('table_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { tenantId, table_number, seats, location } = body
  if (!tenantId || !table_number) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const { data, error } = await sb()
    .from('tables')
    .insert({ tenant_id: tenantId, table_number, seats: seats || 4, location: location || null, status: 'available' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, seats, location, status } = body
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb()
    .from('tables')
    .update({ seats: seats || 4, location: location || null, status: status || 'available' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb().from('tables').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
