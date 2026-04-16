import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, branding } = await request.json()
    if (!tenantId || !branding) {
      return NextResponse.json({ error: 'Missing tenantId or branding' }, { status: 400 })
    }

    const supabase = await createClient()

    // Save with minimal required fields that should exist
    const result = await supabase
      .from('tenant_branding')
      .upsert(
        {
          tenant_id: tenantId,
          primary_color: branding.primary_color || '#3B82F6',
          secondary_color: branding.secondary_color || '#1F2937',
          accent_color: branding.accent_color || '#F59E0B',
          background_color: branding.background_color || '#FFFFFF',
          font_family: branding.font_family || 'Inter',
          logo_url: branding.logo_url || null,
          custom_texts: branding,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      )

    if (result.error) {
      console.error('Supabase error:', result.error)
      return NextResponse.json(
        { error: 'Database error: ' + result.error.message },
        { status: 500 }
      )
    }

    if (branding.logo_url) {
      await supabase
        .from('tenants')
        .update({ logo_url: branding.logo_url })
        .eq('id', tenantId)
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
