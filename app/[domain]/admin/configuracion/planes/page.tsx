'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubscriptionPlan } from '@/lib/types'

interface Props { params: Promise<{ domain: string }> }

export default function PlanesPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansRes = await fetch(`/api/subscription-plans`)
        const plansData = await plansRes.json()
        setPlans(plansData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }
    if (tenantId) fetchData()
  }, [tenantId])

  const handleSelectPlan = async (planName: string) => {
    if (!tenantId) return
    setProcessing(true)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, planName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.url) window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al procesar')
    } finally {
      setProcessing(false)
    }
  }

  const planDescriptions: { [key: string]: string } = {
    basic: 'Ideal para restaurantes pequeños que recién empiezan',
    pro: 'Perfecto para restaurantes medianos con múltiples servicios',
    premium: 'Solución completa con soporte dedicado y todas las características'
  }

  const featureLabels: { [key: string]: string } = {
    max_products: 'Productos en menú',
    orders_per_month: 'Órdenes mensuales',
    categories: 'Categorías de menú',
    support: 'Soporte',
    delivery: 'Entrega a domicilio',
    reservations: 'Sistema de reservas',
    custom_domain: 'Dominio personalizado',
    analytics: 'Analytics avanzados',
    api_access: 'Acceso API',
    dedicated_support: 'Soporte dedicado'
  }

  const featureValues: { [key: string]: (value: any) => string } = {
    support: (value) => {
      const map: { [key: string]: string } = {
        'email': 'Por email',
        'priority_email': 'Email prioritario',
        '24/7_phone': 'Teléfono 24/7'
      }
      return map[value] || String(value)
    },
    delivery: (value) => value === true ? 'Incluido' : 'No incluido',
    reservations: (value) => value === true ? 'Incluido' : 'No incluido',
    custom_domain: (value) => value === true ? 'Sí' : 'No',
    analytics: (value) => value === true ? 'Sí' : 'No',
    api_access: (value) => value === true ? 'Sí' : 'No',
    dedicated_support: (value) => value === true ? 'Sí' : 'No'
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Planes de Suscripción</h2>
        <p className="text-gray-600">Elige el plan que mejor se adapta a tu restaurante</p>
      </div>

      {currentPlan && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm text-green-800">
          <span className="font-medium">Plan actual:</span> <strong className="capitalize">{currentPlan}</strong>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
            currentPlan === plan.name
              ? 'ring-2 ring-blue-600 border-blue-600'
              : 'border-gray-200 hover:border-gray-300'
          }`}>
            <div className="p-6">
              <h3 className="text-xl font-bold capitalize text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{planDescriptions[plan.name]}</p>

              <div className="mb-6 pb-6 border-b">
                <p className="text-3xl font-bold text-gray-900">${plan.monthly_price}</p>
                <p className="text-sm text-gray-500">por mes</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features && Object.entries(plan.features).map(([key, value]) => {
                  const label = featureLabels[key] || key.replace(/_/g, ' ')
                  const displayValue = featureValues[key] ? featureValues[key](value) :
                    (typeof value === 'number' ? value : String(value))

                  return (
                    <li key={key} className="flex gap-3 text-sm">
                      <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                      <div className="flex-1">
                        <span className="text-gray-700">{label}:</span>
                        <span className="text-gray-900 font-medium ml-1">{displayValue}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.name)}
                disabled={processing || currentPlan === plan.name}
                className={`w-full py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentPlan === plan.name
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {processing ? 'Procesando...' : currentPlan === plan.name ? 'Plan actual' : 'Seleccionar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-2">¿Necesitas más información?</h3>
        <p className="text-sm text-gray-700">Todos nuestros planes incluyen soporte para gestión de pedidos, integración con Stripe, y acceso completo al panel administrativo. Puedes cambiar de plan en cualquier momento.</p>
      </div>
    </div>
  )
}
