import { createServiceClient } from '@/lib/supabase/server'
import { getTenantIdFromSlug } from '@/lib/tenant'
import { isInternalCustomerEmail } from '@/lib/customer-sync'
import Link from 'next/link'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function ClientesPage({ params, searchParams }: Props) {
  const { domain: slug } = await params
  const { q } = await searchParams
  const tenantId = await getTenantIdFromSlug(slug)
  if (!tenantId) {
    return <div className="p-8 text-center text-gray-500">Restaurante no encontrado</div>
  }
  const supabase = createServiceClient()

  let query = supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
  }

  const { data: customers } = await query.limit(100)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{customers?.length || 0} clientes registrados</p>
        </div>
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white rounded-xl border">
        {!customers?.length ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">{q ? 'No se encontraron clientes' : 'Aún no hay clientes registrados'}</p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {c.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                  <div className="flex gap-3 mt-0.5">
                    {c.email && !isInternalCustomerEmail(c.email) && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">${Number(c.total_spent || 0).toLocaleString('es-CO')}</p>
                  <p className="text-xs text-gray-400">{c.total_orders || 0} pedidos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
