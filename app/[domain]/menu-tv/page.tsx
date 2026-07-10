import { createServiceClient } from '@/lib/supabase/server'
import { TVMenuScreen } from './TVMenuScreen'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ domain: string }>
}

export default async function PublicTVMenuPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, logo_url')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-3xl font-black text-white">
        Restaurante no encontrado
      </div>
    )
  }

  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('app_name')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const { data: items, error } = await supabase
    .from('tv_menu_items')
    .select('id, name, description, price, category, image_url, badge, featured, sort_order')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('TV menu public error:', error)
  }

  return (
    <TVMenuScreen
      restaurantName={branding?.app_name || tenant.organization_name || 'Restaurante'}
      logoUrl={tenant.logo_url}
      items={items || []}
    />
  )
}
