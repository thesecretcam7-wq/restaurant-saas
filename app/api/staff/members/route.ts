import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

const CREATE_STAFF_ROLES = ['cocinero', 'camarero', 'cajero']
const UPDATE_STAFF_ROLES = ['cocinero', 'camarero', 'cajero', 'admin']

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
    const cleanName = typeof name === 'string' ? name.trim() : ''
    const cleanPin = typeof pin === 'string' ? pin.trim() : ''

    if (!tenantId || !cleanName || !role || !cleanPin) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!CREATE_STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(cleanPin)) {
      return NextResponse.json({ error: 'El PIN debe tener 6 numeros' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('staff_members')
      .insert([{ tenant_id: tenantId, name: cleanName, role, pin: cleanPin, is_active: true }])
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

    const updateData: Record<string, string | boolean> = {}

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim() : ''
      if (!cleanName) return NextResponse.json({ error: 'Nombre invalido' }, { status: 400 })
      updateData.name = cleanName
    }

    if (role !== undefined) {
      if (!UPDATE_STAFF_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
      }
      updateData.role = role
    }

    if (pin !== undefined) {
      const cleanPin = typeof pin === 'string' ? pin.trim() : ''
      if (!/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'El PIN debe tener 6 numeros' }, { status: 400 })
      }
      updateData.pin = cleanPin
    }

    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'Estado invalido' }, { status: 400 })
      }
      updateData.is_active = is_active
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('staff_members')
      .update(updateData)
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
