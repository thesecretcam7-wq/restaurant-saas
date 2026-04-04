import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const domain = request.nextUrl.searchParams.get('domain')
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    const supabase = await createServiceClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('tenant_id', tenant.id)
      .single()

    return NextResponse.json({ ...(settings || {}), tenant_id: tenant.id })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, ...fields } = body

    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    // Only allow safe fields to be updated via this endpoint
    const allowedFields = ['waiter_pin', 'kitchen_pin']
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of allowedFields) {
      if (key in fields) updateData[key] = fields[key]
    }

    const supabase = await createServiceClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const { error } = await supabase
      .from('restaurant_settings')
      .update(updateData)
      .eq('tenant_id', tenant.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
