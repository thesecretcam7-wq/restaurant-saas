'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/currency'
import { SubscriptionPlan } from '@/lib/types'

export default function PlanesPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as string
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get subscription status and tenant ID
        const statusRes = await fetch(`/api/subscription-status?domain=${domain}`)
        const statusData = await statusRes.json()
        setTenantId(statusData.tenantId)
        setCurrentPlan(statusData.plan)

        // Get available plans
        const plansRes = await fetch(`/api/subscription-plans`)
        const plansData = await plansRes.json()
        setPlans(plansData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchData()
  }, [domain])

  const handleSelectPlan = async (planName: string) => {
    if (!tenantId) {
      alert('Error: Tenant not found')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          planName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error creating subscription')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error processing subscription')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando planes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Planes de Suscripción
        </h1>
        <p className="text-lg text-slate-600">
          Elige el plan perfecto para tu restaurante
        </p>
      </div>

      {currentPlan && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
          <p className="text-green-800">
            <span className="font-semibold">Plan actual:</span> {currentPlan}
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
              currentPlan === plan.name
                ? 'ring-2 ring-blue-600 bg-blue-50'
                : 'bg-white'
            }`}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
              <h2 className="text-2xl font-bold text-white mb-2 capitalize">
                {plan.name}
              </h2>
              <div className="text-white text-sm opacity-90">
                {plan.name === 'basic' && 'Para empezar'}
                {plan.name === 'pro' && 'Más popular'}
                {plan.name === 'premium' && 'Para crecer'}
              </div>
            </div>

            <div className="px-6 py-8">
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">
                  {formatPrice(plan.monthly_price, 'EUR')}
                </span>
                <span className="text-slate-600 ml-2">/mes</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features && typeof plan.features === 'object' ? (
                  Object.entries(plan.features).map(([key, value]) => (
                    <li
                      key={key}
                      className="flex items-start text-slate-700"
                    >
                      <span className="text-green-600 mr-3 mt-1">✓</span>
                      <span>
                        {typeof value === 'number'
                          ? `${value} ${key.replace(/_/g, ' ')}`
                          : String(value)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-700">Acceso completo a todas las funciones</li>
                )}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.name)}
                disabled={processing || currentPlan === plan.name}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  currentPlan === plan.name
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {processing
                  ? 'Procesando...'
                  : currentPlan === plan.name
                    ? 'Plan Actual'
                    : 'Seleccionar Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-slate-50 rounded-lg p-8 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          ¿Preguntas?
        </h3>
        <p className="text-slate-600 mb-4">
          Si tienes dudas sobre nuestros planes o necesitas ayuda para elegir,
          contáctanos.
        </p>
        <a
          href="mailto:soporte@restaurantsaas.com"
          className="text-blue-600 hover:underline font-medium"
        >
          soporte@restaurantsaas.com
        </a>
      </div>
    </div>
  )
}
