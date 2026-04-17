import { createServiceClient } from '@/lib/supabase/server'
import { POSTerminal } from '@/components/admin/POSTerminal'
import Link from 'next/link'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function StaffPOSPage({ params }: Props) {
  const { domain: slug } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single()

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400 text-xl">
        Restaurante no encontrado
      </div>
    )
  }

  return (
    <div className="relative">
      <Link
        href={`/${tenant.id}/staff`}
        className="fixed top-3 left-3 z-50 flex items-center gap-1.5 bg-gray-900/90 backdrop-blur border border-gray-700 text-gray-300 hover:text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
      >
        ← Portal
      </Link>
      <POSTerminal tenantId={tenant.id} country="CO" />
    </div>
  )
}
