import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    const supabase = createServiceClient()
    const { data } = await supabase
      .from('tenant_branding')
      .select('page_config')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return NextResponse.json({ page_config: data?.page_config || null })
  } catch (err) {
    console.error('[page-config GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, page_config } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('tenant_branding')
      .update({ page_config })
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('[page-config PUT]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[page-config PUT] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
