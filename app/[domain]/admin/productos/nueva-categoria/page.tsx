import { createServiceClient } from '@/lib/supabase/server'
import NuevaCategoriaClient from './NuevaCategoriaClient'

interface Props { params: Promise<{ domain: string }> }

export default async function NuevaCategoriaPage({ params }: Props) {
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

  return (
    <NuevaCategoriaClient
      domain={domain}
      tenantId={tenant.id}
    />
  )
}

