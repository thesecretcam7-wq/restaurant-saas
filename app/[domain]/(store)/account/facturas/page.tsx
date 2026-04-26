import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import InvoicesList from './InvoicesList'

interface PageParams {
  params: Promise<{ domain: string }>
}

export const revalidate = 60

export default async function FacturasPage({ params }: PageParams) {
  const { domain } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${domain}/login`)
  }

  // Get tenant by domain
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    redirect(`/${domain}/login`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Facturas</h1>
            <p className="text-gray-600 mt-1">Descarga y visualiza tus invoices</p>
          </div>
          <Link href={`/${domain}/account/suscripcion`} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
            ← Volver
          </Link>
        </div>

        <InvoicesList tenantId={tenant.id} />
      </div>
    </div>
  )
}
