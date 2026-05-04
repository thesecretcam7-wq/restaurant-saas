import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveTenantId(supabase: ReturnType<typeof createServiceClient>, tenantId: string): Promise<string | null> {
  if (UUID_RE.test(tenantId)) return tenantId
  const { data } = await supabase.from('tenants').select('id').eq('slug', tenantId).maybeSingle()
  return data?.id || null
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('tenantId')
    if (!raw) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, raw)
    if (!tenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

    const { data } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single()

    return NextResponse.json({ page_config: data?.metadata?.page_config || null })
  } catch (err) {
    console.error('[page-config GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId: raw, page_config } = await request.json()
    if (!raw) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, raw)
    if (!tenantId) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

    // Get current metadata to preserve other fields
    const { data: currentTenant } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single()

    const updatedMetadata = {
      ...(currentTenant?.metadata || {}),
      page_config,
    }

    const { error } = await supabase
      .from('tenants')
      .update({ metadata: updatedMetadata })
      .eq('id', tenantId)

    if (error) {
      console.error('[page-config PUT] code:', error.code, 'msg:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Revalidate all store pages immediately when page config changes
    // This ensures changes appear within 30s on home page
    revalidatePath(`/${raw}`, 'layout')
    revalidatePath(`/${raw}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[page-config PUT] exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
