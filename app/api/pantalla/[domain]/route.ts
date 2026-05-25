import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { deriveBrandPalette } from '@/lib/brand-colors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('app_name, primary_color, secondary_color, accent_color, background_color, text_primary_color, text_secondary_color')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, display_number, order_number, customer_name, delivery_type, table_number, status, created_at')
    .eq('tenant_id', tenant.id)
    .in('status', ['confirmed', 'preparing', 'ready'])
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: true })

  const palette = deriveBrandPalette()

  return NextResponse.json(
    {
      restaurantName: branding?.app_name || tenant.organization_name,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      accentColor: palette.accent,
      backgroundColor: palette.background,
      textPrimaryColor: palette.pageText,
      textSecondaryColor: palette.mutedText,
      orders: orders || [],
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
