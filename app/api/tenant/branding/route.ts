import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const { tenantId, branding } = await request.json()
    if (!tenantId || !branding) {
      return NextResponse.json({ error: 'Missing tenantId or branding' }, { status: 400 })
    }

    const supabase = await createClient()

    // Save all branding data in tenants.metadata (guaranteed to exist)
    const result = await supabase
      .from('tenants')
      .update({
        logo_url: branding.logo_url || null,
        metadata: branding,
      })
      .eq('id', tenantId)

    if (result.error) {
      console.error('Supabase error:', result.error)
      return NextResponse.json(
        { error: 'Database error: ' + result.error.message },
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
