import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, store_enabled } = await request.json()

    if (!tenantId || typeof store_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .maybeSingle()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }

    const metadata = (tenant.metadata || {}) as Record<string, any>
    const { error } = await supabase
      .from('tenants')
      .update({
        metadata: {
          ...metadata,
          store_enabled,
        },
      })
      .eq('id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, store_enabled })
  } catch (error) {
    console.error('Store status error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
