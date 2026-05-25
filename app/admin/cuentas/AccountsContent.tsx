'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { calculateTrialStatus, getTrialEndsAt } from '@/lib/trial'
import UnlockAccountModal from '@/components/admin/UnlockAccountModal'

interface Tenant {
  id: string
  organization_name: string
  owner_name: string
  owner_email: string
  status: string
  subscription_plan: string | null
  subscription_expires_at: string | null
  trial_ends_at: string | null
  created_at: string
  stripe_account_status: string | null
  metadata?: Record<string, any> | null
}

interface AccountsContentProps {
  initialTenants: Tenant[]
}

export default function AccountsContent({ initialTenants }: AccountsContentProps) {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('estado') || 'all'
  const [tenants] = useState<Tenant[]>(initialTenants)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch =
      tenant.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.owner_email.toLowerCase().includes(searchQuery.toLowerCase())

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'manual') return matchesSearch && tenant.metadata?.billing_source === 'manual'
    return matchesSearch && tenant.status === filterStatus
  })

  const handleUnlockSuccess = () => {
    window.location.reload()
  }

  const getStatusBadge = (tenant: Tenant) => {
    const isManual = tenant.metadata?.billing_source === 'manual'

    if (tenant.status === 'active') {
      return (
        <div className="flex flex-wrap gap-1">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Activo</span>
          {isManual && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">Manual</span>
          )}
        </div>
      )
    }

    if (tenant.status === 'trial') {
      const trialStatus = calculateTrialStatus(getTrialEndsAt(tenant.trial_ends_at, tenant.created_at))
      if (trialStatus.isExpired) {
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Prueba Expirada</span>
      }
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Prueba ({trialStatus.daysRemaining}d)</span>
    }

    if (tenant.status === 'suspended') {
      return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">Suspendido</span>
    }

    return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">{tenant.status}</span>
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="trial">Prueba</option>
              <option value="active">Activos</option>
              <option value="manual">Manuales</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Restaurante</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Dueno</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Creado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No hay cuentas que coincidan con tu busqueda
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{tenant.organization_name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{tenant.owner_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{tenant.owner_email}</td>
                    <td className="px-6 py-4">{getStatusBadge(tenant)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {tenant.subscription_plan ? (
                        <div className="space-y-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {tenant.subscription_plan}
                          </span>
                          {tenant.subscription_expires_at ? (
                            <p className="text-[11px] text-gray-500">
                              Vence {new Date(tenant.subscription_expires_at).toLocaleDateString('es-CO')}
                            </p>
                          ) : tenant.status === 'active' ? (
                            <p className="text-[11px] text-purple-600 font-semibold">Sin vencimiento</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(tenant.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedTenant(tenant)
                          setShowUnlockModal(true)
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Mostrando {filteredTenants.length} de {tenants.length} cuentas
        </div>
      </div>

      {showUnlockModal && selectedTenant && (
        <UnlockAccountModal
          tenantId={selectedTenant.id}
          tenantName={selectedTenant.organization_name}
          currentPlan={selectedTenant.subscription_plan}
          currentStatus={selectedTenant.status}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </>
  )
}
