import { createServiceClient } from '@/lib/supabase/server'
import NuevoProductoClient from './NuevoProductoClient'

interface Props { params: Promise<{ domain: string }> }

export default async function NuevoProductoPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Restaurante no encontrado</p>
      </div>
    )
  }

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .order('sort_order')

  return (
    <NuevoProductoClient
      domain={domain}
      tenantId={tenant.id}
      categories={categories || []}
    />
  )
}
