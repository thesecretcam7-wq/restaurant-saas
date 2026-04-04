import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

  const { data } = await supabase()
    .from('tenant_branding')
    .select('page_config')
    .eq('tenant_id', tenantId)
    .single()

  return NextResponse.json({ page_config: data?.page_config || null })
}

export async function PUT(request: NextRequest) {
  const { tenantId, page_config } = await request.json()
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

  const { error } = await supabase()
    .from('tenant_branding')
    .update({ page_config })
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
