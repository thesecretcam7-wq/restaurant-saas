import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero', 'camarero'] })

    const { data, error } = await sb()
      .from('tables')
      .select('id, table_number, seats, location, status')
      .eq('tenant_id', tenantId)
      .order('table_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, table_number, seats, location } = body
    if (!tenantId || !table_number) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data, error } = await sb()
      .from('tables')
      .insert({ tenant_id: tenantId, table_number, seats: seats || 4, location: location || null, status: 'available' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, seats, location, status } = body
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const supabase = sb()
    const { data: current } = await supabase.from('tables').select('tenant_id').eq('id', id).single()
    if (!current?.tenant_id) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })

    await requireTenantAccess(current.tenant_id, { staffRoles: ['admin', 'cajero', 'camarero'] })

    const { error } = await supabase
      .from('tables')
      .update({ seats: seats || 4, location: location || null, status: status || 'available' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const supabase = sb()
    const { data: current } = await supabase.from('tables').select('tenant_id').eq('id', id).single()
    if (!current?.tenant_id) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })

    await requireTenantAccess(current.tenant_id, { staffRoles: ['admin'], requireAdminPermission: true })

    const { error } = await supabase.from('tables').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
