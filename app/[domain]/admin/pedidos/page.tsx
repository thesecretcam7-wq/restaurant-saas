import { createServiceClient } from '@/lib/supabase/server'
import { getTenantContext, getTenantIdFromSlug } from '@/lib/tenant'
import { getRestaurantLocale, getRestaurantTimeZone } from '@/lib/restaurant-time'
import { PackageOpen } from 'lucide-react'
import PedidosClient from './PedidosClient'

interface PedidosProps {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PedidosPage({ params, searchParams }: PedidosProps) {
  const { domain: slug } = await params
  const { status } = await searchParams
  const supabase = createServiceClient()
  const tenantId = await getTenantIdFromSlug(slug)

  if (!tenantId) {
    return (
      <div className="admin-empty">
        <PackageOpen className="mb-3 size-8 text-black/24" />
        <p className="font-black text-[#15130f]">Restaurante no encontrado</p>
      </div>
    )
  }

  const context = await getTenantContext(tenantId)
  const restaurantName = context.branding?.app_name || context.tenant?.organization_name || 'Restaurante'
  const restaurantCountry = context.settings?.country || (context.tenant as { country?: string | null } | null)?.country || 'CO'
  const restaurantLocale = getRestaurantLocale(restaurantCountry)
  const restaurantTimeZone = getRestaurantTimeZone({
    timezone: context.settings?.timezone,
    settingsCountry: context.settings?.country,
    tenantCountry: (context.tenant as { country?: string | null } | null)?.country,
  })

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <PedidosClient
      slug={slug}
      restaurantName={restaurantName}
      orders={orders || []}
      initialStatus={status || ''}
      restaurantLocale={restaurantLocale}
      restaurantTimeZone={restaurantTimeZone}
    />
  )
}
