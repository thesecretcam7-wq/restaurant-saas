import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, logoUrl } = await request.json()

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('tenants')
      .update({
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (error) {
      console.error('Error updating tenant logo:', error)
      return NextResponse.json({ error: 'No se pudo guardar el logo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, logoUrl: logoUrl || null })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }

    console.error('Tenant logo error:', error)
    return NextResponse.json({ error: 'Error al guardar el logo' }, { status: 500 })
  }
}
