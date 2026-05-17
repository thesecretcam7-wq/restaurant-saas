'use client'

import { useState } from 'react'
import ChangePlanModal from './ChangePlanModal'
import { PLAN_PRICES } from '@/lib/subscription-pricing'

interface Tenant {
  id: string
  subscription_plan: string | null
  subscription_expires_at: string | null
  trial_ends_at: string | null
  created_at?: string | null
  status: string
}

const plans = [
  {
    id: 'basic',
    name: 'Basico',
    price: PLAN_PRICES.basic,
    description: 'Carta QR, TPV, comandero y KDS para operar caja, sala y cocina',
    features: [
      'Carta QR incluida',
      'TPV / POS completo',
      'Comandero para meseros',
      'KDS cocina incluido',
      'Hasta 1.000 pedidos/mes',
      'Soporte por email',
    ],
    cta: 'Elegir Plan',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: PLAN_PRICES.pro,
    description: 'Operacion completa con pagina web y kiosko',
    features: [
      'Todo en Basico',
      'Pagina web del restaurante',
      'Kiosko autoservicio',
      'Pedidos ilimitados',
      'Reservas y delivery',
      'Analytics avanzado',
    ],
    cta: 'Elegir Plan',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: PLAN_PRICES.premium,
    description: 'Todas las funciones con disenos exclusivos',
    features: [
      'Todo en Pro',
      'Disenos exclusivos para cada cliente',
      'Dominio personalizado',
      'Multiples sucursales',
      'Integraciones personalizadas',
      'API access',
      'Soporte 24/7 dedicado',
    ],
    cta: 'Elegir Plan',
  },
]

export default function PlanComparison({ tenant, domain }: { tenant: Tenant; domain: string }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
  }

  const currentPlan = tenant.subscription_plan || null

  return (
    <div className="space-y-8">
      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = currentPlan === plan.id
          const isUpgrade = currentPlan && ['basic', 'pro'].includes(currentPlan) &&
            (['pro', 'premium'].includes(plan.id) &&
            (currentPlan === 'basic' ? plan.id !== 'basic' : plan.id === 'premium'))
          const isDowngrade = currentPlan && ['pro', 'premium'].includes(currentPlan) &&
            (currentPlan === 'pro' ? plan.id === 'basic' : ['basic', 'pro'].includes(plan.id))

          return (
            <div
              key={plan.id}
              className={`rounded-xl border-2 transition-all ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : plan.popular
                  ? 'border-purple-500 bg-white shadow-lg'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="bg-purple-500 text-white text-center py-2 font-semibold text-sm rounded-t-[8px]">
                  ⭐ MÁS POPULAR
                </div>
              )}

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-900">
                    EUR {plan.price}
                    <span className="text-lg font-normal text-gray-600">/mes</span>
                  </div>
                </div>

                {isCurrent && (
                  <div className="mb-6 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-center font-semibold text-sm">
                    ✓ Plan Actual
                  </div>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors mb-6 ${
                    isCurrent
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : isUpgrade
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : isDowngrade
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCurrent ? 'Plan Actual' : isUpgrade ? 'Mejorar' : isDowngrade ? 'Cambiar' : 'Elegir'}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <span className="mr-3 text-green-600 font-bold">✓</span>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Comparación Detallada</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Característica</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Básico</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Pro</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 font-semibold text-gray-900">TPV / POS</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">Carta QR</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold text-gray-900">Comandero</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">KDS cocina</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold text-gray-900">Pagina web</td>
                <td className="px-6 py-4 text-center">-</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">Kiosko autoservicio</td>
                <td className="px-6 py-4 text-center">-</td>
                <td className="px-6 py-4 text-center">Si</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold text-gray-900">Disenos exclusivos</td>
                <td className="px-6 py-4 text-center">-</td>
                <td className="px-6 py-4 text-center">-</td>
                <td className="px-6 py-4 text-center">Si</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">Soporte</td>
                <td className="px-6 py-4 text-center">Email</td>
                <td className="px-6 py-4 text-center">Prioritario</td>
                <td className="px-6 py-4 text-center">24/7 dedicado</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedPlan && (
        <ChangePlanModal
          currentPlan={tenant.subscription_plan || 'trial'}
          newPlan={selectedPlan}
          domain={domain}
          tenantId={tenant.id}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}

