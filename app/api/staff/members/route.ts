import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('staff_members')
      .select('id, name, role, pin, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff: data })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, name, role, pin } = await request.json()

    if (!tenantId || !name || !role || !pin) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!['cocinero', 'camarero', 'cajero'].includes(role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('staff_members')
      .insert([{ tenant_id: tenantId, name, role, pin, is_active: true }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff: data })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, role, pin, is_active } = await request.json()

    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: current } = await supabase
      .from('staff_members')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!current?.tenant_id) return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 })

    await requireTenantAccess(current.tenant_id, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data, error } = await supabase
      .from('staff_members')
      .update({ name, role, pin, is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ staff: data })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: current } = await supabase
      .from('staff_members')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!current?.tenant_id) return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 })

    await requireTenantAccess(current.tenant_id, { staffRoles: ['admin'], requireAdminPermission: true })

    const { error } = await supabase.from('staff_members').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
