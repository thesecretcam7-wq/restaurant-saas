import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get('domain')
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    // SECURITY: Verify user owns the tenant
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers')
    try {
      const { tenantId } = await verifyTenantOwnership(request, domain)

      const supabase = createServiceClient()

      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      return NextResponse.json({ ...(settings || {}), tenant_id: tenantId })
    } catch (authError) {
      const { sendErrorResponse } = await import('@/lib/auth-helpers')
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500
      return sendErrorResponse(authError, statusCode)
    }
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, ...fields } = body

    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    // SECURITY: Verify user owns the tenant
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers')
    try {
      const { tenantId } = await verifyTenantOwnership(request, domain)

      // Only allow safe fields to be updated via this endpoint
      const allowedFields = ['waiter_pin', 'kitchen_pin']
      const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const key of allowedFields) {
        if (key in fields) updateData[key] = fields[key]
      }

      const supabase = createServiceClient()

      const { error } = await supabase
        .from('restaurant_settings')
        .update(updateData)
        .eq('tenant_id', tenantId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ success: true })
    } catch (authError) {
      const { sendErrorResponse } = await import('@/lib/auth-helpers')
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500
      return sendErrorResponse(authError, statusCode)
    }
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
