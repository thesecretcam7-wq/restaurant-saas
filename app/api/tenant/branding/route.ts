import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const TENANT_BRANDING_COLUMNS = new Set([
  'primary_color',
  'secondary_color',
  'accent_color',
  'background_color',
  'button_primary_color',
  'button_secondary_color',
  'text_primary_color',
  'text_secondary_color',
  'border_color',
  'font_family',
  'heading_font',
  'font_url',
  'heading_font_url',
  'heading_font_size',
  'body_font_size',
  'border_radius',
  'button_border_radius',
  'shadow_intensity',
  'button_style',
  'app_name',
  'tagline',
  'hero_image_url',
  'description',
  'favicon_url',
  'instagram_url',
  'facebook_url',
  'whatsapp_number',
  'contact_email',
  'contact_phone',
  'booking_description',
  'delivery_description',
  'featured_text',
  'custom_texts',
  'custom_css',
  'page_config',
])

function pickTenantBrandingColumns(branding: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(branding).filter(([key]) => TENANT_BRANDING_COLUMNS.has(key))
  )
}

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
      supabase.from('tenants').select('logo_url, metadata').eq('id', tenantId).maybeSingle(),
    ])

    const metadataBranding = (tenantRes.data?.metadata || {}) as Record<string, any>

    return NextResponse.json({
      branding: {
        ...(metadataBranding || {}),
        ...(brandingRes.data || {}),
      },
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

    // tenant_branding has a stable schema, while advanced visual controls live in tenant metadata.
    // This lets us add UI options without breaking saves when a database migration has not run yet.
    const { logo_url, ...brandingDataWithoutLogo } = branding
    const brandingData = {
      ...pickTenantBrandingColumns(brandingDataWithoutLogo),
      tenant_id: tenantId,
    }
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
