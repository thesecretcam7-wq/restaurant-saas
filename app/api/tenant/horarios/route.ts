import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { NextRequest, NextResponse } from 'next/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, operating_hours } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

    const supabase = createServiceClient()

    // tenantId might be a slug, so we need to get the actual UUID and name
    let actualTenantId = tenantId
    let tenantName = ''
    if (!UUID_RE.test(tenantId)) {
      // If it doesn't contain a hyphen, it's likely a slug, not a UUID
      // Look up the tenant by slug
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, organization_name')
        .eq('slug', tenantId)
        .maybeSingle()

      if (!tenantData) {
        return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
      }
      actualTenantId = tenantData.id
      tenantName = tenantData.organization_name
    } else {
      // If it's a UUID, fetch the tenant name
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('organization_name')
        .eq('id', tenantId)
        .maybeSingle()

      if (!tenantData) {
        return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
      }
      actualTenantId = tenantId
      tenantName = tenantData.organization_name
    }

    await requireTenantAccess(actualTenantId, { staffRoles: ['admin'] })

    // Use upsert: insert if not exists, update if exists
    const { data, error } = await supabase
      .from('restaurant_settings')
      .upsert(
        {
          tenant_id: actualTenantId,
          display_name: tenantName,
          operating_hours,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'tenant_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving hours:', error)
      return NextResponse.json({ error: `Error al guardar: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ success: true, data, message: 'Horarios actualizados' })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('PUT /api/tenant/horarios error:', error)
    return NextResponse.json({ error: `Error interno: ${error instanceof Error ? error.message : 'Unknown'}` }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const slugOrId = request.nextUrl.searchParams.get('tenantId')
  if (!slugOrId) return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 })

  const supabase = createServiceClient()
  let actualTenantId = slugOrId
  if (!UUID_RE.test(slugOrId)) {
    const { data: tenantData } = await supabase.from('tenants').select('id').eq('slug', slugOrId).maybeSingle()
    if (!tenantData) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    actualTenantId = tenantData.id
  }

  const { data } = await supabase
    .from('restaurant_settings')
    .select('operating_hours')
    .eq('tenant_id', actualTenantId)
    .single()

  return NextResponse.json({ success: true, data })
}
