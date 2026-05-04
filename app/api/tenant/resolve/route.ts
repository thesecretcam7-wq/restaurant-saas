import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data, error } = await supabase
    .from('tenants')
    .select('id, country')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  return NextResponse.json(data)
}
