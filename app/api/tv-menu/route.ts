import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const { data, error } = await serviceClient()
      .from('tv_menu_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('TV menu GET error:', error)
    return NextResponse.json({ error: 'No se pudo cargar el menu TV' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = normalizeText(body.tenantId)
    const name = normalizeText(body.name)
    const price = toNumber(body.price)

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'Completa nombre del producto' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const payload = {
      tenant_id: tenantId,
      name,
      description: normalizeText(body.description) || null,
      price,
      category: normalizeText(body.category) || 'Menu del dia',
      image_url: normalizeText(body.imageUrl) || null,
      badge: normalizeText(body.badge) || null,
      active: body.active !== false,
      featured: Boolean(body.featured),
      sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
    }

    const supabase = serviceClient()
    const id = normalizeText(body.id)
    const result = id
      ? await supabase
          .from('tv_menu_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select('*')
          .single()
      : await supabase
          .from('tv_menu_items')
          .insert(payload)
          .select('*')
          .single()

    if (result.error) throw result.error
    return NextResponse.json({ item: result.data }, { status: id ? 200 : 201 })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('TV menu save error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const id = searchParams.get('id')

  if (!tenantId || !id) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const { error } = await serviceClient()
      .from('tv_menu_items')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('TV menu delete error:', error)
    return NextResponse.json({ error: 'No se pudo borrar' }, { status: 500 })
  }
}
