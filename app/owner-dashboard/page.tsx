import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only allow the super admin
  const ownerEmails = ['thesecretcam7@gmail.com']
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  // Get all accounts
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, organization_name, owner_email, status, trial_ends_at, created_at, slug')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Propietario</h1>
            <p className="text-gray-600">Gestiona todas las cuentas de Eccofood</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Bienvenido</p>
            <p className="font-semibold text-gray-900">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Cuentas Card */}
          <Link href="/gestionar-cuentas" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-l-4 border-blue-500">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Gestionar Cuentas</h2>
              <p className="text-sm text-gray-600 mb-4">Ver y desbloquear cuentas</p>
              <div className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform text-sm">
                Ir
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Ingresos Card */}
          <Link href="/admin/ingresos" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer border-l-4 border-green-500">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard de Ingresos</h2>
              <p className="text-sm text-gray-600 mb-4">Analiza ingresos y subscripciones</p>
              <div className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-1 transition-transform text-sm">
                Ir
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Total de Cuentas</h2>
            <p className="text-3xl font-bold text-purple-600">{tenants?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-2">Restaurantes activos</p>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Trial Gratis</h2>
            <p className="text-sm text-gray-600">30 días de acceso</p>
            <p className="text-xs text-gray-500 mt-2">Por cuenta nueva</p>
          </div>
        </div>

        {/* Recent Accounts */}
        {tenants && tenants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Cuentas Recientes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Restaurante</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Creado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{tenant.organization_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.owner_email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tenant.status === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : tenant.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(tenant.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={`https://${tenant.slug}.eccofood.vercel.app/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-semibold"
                        >
                          Entrar
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200 text-center">
              <Link href="/gestionar-cuentas" className="text-blue-600 font-semibold hover:text-blue-700">
                Ver todas las cuentas →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
