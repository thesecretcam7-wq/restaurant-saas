import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, role, pin, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function POST(request: NextRequest) {
  const { tenantId, name, role, pin } = await request.json()

  if (!tenantId || !name || !role || !pin) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (!['cocinero', 'camarero', 'cajero'].includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('staff_members')
    .insert([{ tenant_id: tenantId, name, role, pin, is_active: true }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function PUT(request: NextRequest) {
  const { id, name, role, pin, is_active } = await request.json()

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('staff_members')
    .update({ name, role, pin, is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff: data })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase.from('staff_members').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
