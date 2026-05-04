import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

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

    const { data: currentTenant } = await supabase
      .from('tenants')
      .select('metadata, slug')
      .eq('id', tenantId)
      .maybeSingle()

    // Save branding data to tenant_branding table (this is what API reads from)
    // Exclude logo_url since it goes to tenants table
    const { logo_url, ...brandingDataWithoutLogo } = branding
    const brandingData = { ...brandingDataWithoutLogo, tenant_id: tenantId }
    const metadata = {
      ...(currentTenant?.metadata || {}),
      ...branding,
    }
    const [brandingRes, tenantRes] = await Promise.all([
      supabase.from('tenant_branding').upsert(brandingData, { onConflict: 'tenant_id' }),
      supabase.from('tenants').update({
        logo_url: logo_url || null,
        metadata,
      }).eq('id', tenantId).select('slug').maybeSingle(),
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

    const slug = tenantRes.data?.slug || currentTenant?.slug
    if (slug) {
      revalidatePath(`/${slug}`, 'layout')
      revalidatePath(`/${slug}`)
      revalidatePath(`/${slug}/menu`)
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
