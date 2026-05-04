import { createClient } from '@/lib/supabase/server'
import { KDSScreen } from '@/components/admin/KDSScreen'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function KDSPage({ params }: Props) {
  const { domain: slug } = await params

  const supabase = await createClient()

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  let tenantId: string | null = null

  if (isUUID) {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', slug)
      .single()
    tenantId = data?.id ?? null
  } else {
    const { data } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()
    tenantId = data?.id ?? null
  }

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-red-500 text-xl">
        Error: Restaurante no encontrado
      </div>
    )
  }

  return <KDSScreen tenantId={tenantId} />
}
