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
    .select('app_name, primary_color')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('id, display_number, order_number, status, created_at')
    .eq('tenant_id', tenant.id)
    .in('status', ['confirmed', 'preparing', 'ready'])
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: true })

  return NextResponse.json(
    {
      restaurantName: branding?.app_name || tenant.organization_name,
      primaryColor: branding?.primary_color || '#2563eb',
      orders: orders || [],
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
