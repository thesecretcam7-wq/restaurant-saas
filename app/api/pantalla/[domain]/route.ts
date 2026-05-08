import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  return NextResponse.json(
    {
      restaurantName: branding?.app_name || tenant.organization_name,
      primaryColor: branding?.primary_color || '#2563eb',
      secondaryColor: branding?.secondary_color || '#111827',
      accentColor: branding?.accent_color || branding?.primary_color || '#2563eb',
      backgroundColor: branding?.background_color || '#0b0b0b',
      textPrimaryColor: branding?.text_primary_color || '#ffffff',
      textSecondaryColor: branding?.text_secondary_color || '#d1d5db',
      orders: orders || [],
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
