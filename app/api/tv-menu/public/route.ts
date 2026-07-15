import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  try {
    const { data, error } = await serviceClient()
      .from('tv_menu_items')
      .select('id, name, description, price, category, image_url, badge, featured, sort_order')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error('Public TV menu GET error:', error)
    return NextResponse.json({ error: 'No se pudo cargar el menu TV' }, { status: 500 })
  }
}
