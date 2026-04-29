import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [brandingRes, tenantRes] = await Promise.all([
      supabase.from('tenant_branding').select('*').eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('tenants').select('logo_url').eq('id', tenantId).maybeSingle(),
    ])

    return NextResponse.json({
      branding: brandingRes.data || null,
      tenant: tenantRes.data || null,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + (error as any).message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, branding } = await request.json()
    if (!tenantId || !branding) {
      return NextResponse.json({ error: 'Missing tenantId or branding' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Save branding data to tenant_branding table (this is what API reads from)
    const brandingData = { ...branding, tenant_id: tenantId }
    const [brandingRes, tenantRes] = await Promise.all([
      supabase.from('tenant_branding').upsert(brandingData, { onConflict: 'tenant_id' }),
      supabase.from('tenants').update({
        logo_url: branding.logo_url || null,
        metadata: branding,
      }).eq('id', tenantId),
    ])

    if (brandingRes.error) {
      console.error('Branding error:', brandingRes.error)
      return NextResponse.json(
        { error: 'Database error: ' + brandingRes.error.message },
        { status: 500 }
      )
    }
    if (tenantRes.error) {
      console.error('Tenant error:', tenantRes.error)
      return NextResponse.json(
        { error: 'Database error: ' + tenantRes.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Server error: ' + (error as any).message },
      { status: 500 }
    )
  }
}
