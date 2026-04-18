import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, pin, role } = body

    if (!domain || !pin || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create service client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get tenant by slug or id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    // Find staff member by PIN and role
    const { data: staff, error: staffError } = await supabase
      .from('staff_members')
      .select('id, name, role, is_active')
      .eq('tenant_id', tenant.id)
      .eq('pin', pin)
      .eq('role', role)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      console.error('Staff auth error:', staffError)
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      staff_id: staff.id,
      staff_name: staff.name,
      role: staff.role,
    })
  } catch (error) {
    console.error('Staff auth exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
