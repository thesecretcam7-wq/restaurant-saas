import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getLockedTenantBrandingColors } from '@/lib/brand-colors'

const BRANDING_PUBLIC_COLUMNS = [
  'tenant_id',
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
  'page_config',
].join(', ')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const [brandingRes, tenantRes] = await Promise.all([
      supabase.from('tenant_branding').select(BRANDING_PUBLIC_COLUMNS).eq('tenant_id', tenantId).maybeSingle(),
      supabase.from('tenants').select('logo_url, metadata').eq('id', tenantId).maybeSingle(),
    ])

    const metadataBranding = (tenantRes.data?.metadata || {}) as Record<string, any>

    const lockedBrandingColors = getLockedTenantBrandingColors()

    return NextResponse.json({
      branding: {
        ...(metadataBranding || {}),
        ...((brandingRes.data || {}) as Record<string, any>),
        ...lockedBrandingColors,
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
