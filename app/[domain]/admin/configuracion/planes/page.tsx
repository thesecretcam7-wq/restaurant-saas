'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubscriptionPlan } from '@/lib/types'

interface Props { params: Promise<{ domain: string }> }

interface SystemFeature {
  name: string
  description: string
  icon: string
}

const SYSTEM_FEATURES: SystemFeature[] = [
  { name: 'POS', icon: '💳', description: 'Sistema de Punto de Venta' },
  { name: 'Comandera', icon: '📋', description: 'Control de Meseros' },
  { name: 'KDS', icon: '👨‍🍳', description: 'Pantalla de Cocina' }
]

const planHighlights: { [key: string]: string[] } = {
  basic: [
    '✓ POS completo',
    '✓ Hasta 100 productos',
    '✓ Reportes básicos',
    '✓ Soporte por email',
    '✓ Integración Stripe'
  ],
  pro: [
    '✓ POS y Comandera',
    '✓ Hasta 500 productos',
    '✓ Analytics avanzados',
    '✓ Soporte prioritario',
    '✓ Custom domain',
    '✓ API access'
  ],
  premium: [
    '✓ Sistema completo POS + Comandera + KDS',
    '✓ Productos ilimitados',
    '✓ Analytics avanzados + IA',
    '✓ Soporte 24/7 dedicado',
    '✓ Custom domain',
    '✓ API access + webhooks',
    '✓ Integración multi-sucursal'
  ]
}

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
    basic: 'POS completo para empezar. Ideal para negocios que inician su transformación digital',
    pro: 'Solución integral con Comandera incluida. Para restaurantes con operaciones en crecimiento',
    premium: 'Ecosistema completo: POS + Comandera + KDS. Máximo control y eficiencia operacional'
  }

  const planSubtitles: { [key: string]: string } = {
    basic: 'Comienza tu transformación digital',
    pro: 'Crece con confianza y control',
    premium: 'Domina tu operación completa'
  }

  const systemsIncluded: { [key: string]: string[] } = {
    basic: ['POS'],
    pro: ['POS', 'Comandera'],
    premium: ['POS', 'Comandera', 'KDS']
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
        {plans.map(plan => {
          const systems = systemsIncluded[plan.name] || []
          const highlights = planHighlights[plan.name] || []

          return (
            <div key={plan.id} className={`bg-white rounded-xl border-2 overflow-hidden transition-all shadow-md hover:shadow-lg ${
              currentPlan === plan.name
                ? 'ring-2 ring-blue-600 border-blue-600'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              {currentPlan === plan.name && (
                <div className="bg-blue-600 px-6 py-2 text-white text-xs font-semibold text-center">
                  PLAN ACTUAL
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold capitalize text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-6">{planDescriptions[plan.name]}</p>

                <div className="mb-8 pb-8 border-b">
                  <p className="text-4xl font-bold text-gray-900">${plan.monthly_price}</p>
                  <p className="text-sm text-gray-500">por mes</p>
                </div>

                {/* Systems Showcase */}
                <div className="mb-8">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Sistemas Incluidos</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {SYSTEM_FEATURES.map(feature => {
                      const isIncluded = systems.includes(feature.name)
                      return (
                        <div
                          key={feature.name}
                          className={`p-3 rounded-lg text-center transition-all ${
                            isIncluded
                              ? 'bg-blue-50 border-2 border-blue-200'
                              : 'bg-gray-50 border-2 border-gray-100 opacity-40'
                          }`}
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <p className="text-xs font-bold text-gray-900">{feature.name}</p>
                          <p className={`text-xs mt-1 ${isIncluded ? 'text-blue-700' : 'text-gray-500'}`}>
                            {isIncluded ? '✓ Incluido' : 'No incluido'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="mb-8">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Características</h4>
                  <ul className="space-y-2">
                    {highlights.map((highlight, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                        <span className="text-gray-700">{highlight.replace('✓ ', '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Details */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detalles Técnicos</h4>
                  <ul className="space-y-2 text-xs">
                    {plan.features && Object.entries(plan.features).slice(0, 4).map(([key, value]) => {
                      const label = featureLabels[key] || key.replace(/_/g, ' ')
                      const displayValue = featureValues[key] ? featureValues[key](value) :
                        (typeof value === 'number' ? value : String(value))

                      return (
                        <li key={key} className="flex justify-between text-gray-700">
                          <span>{label}:</span>
                          <span className="font-medium text-gray-900">{displayValue}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={processing || currentPlan === plan.name}
                  className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                    currentPlan === plan.name
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {processing ? 'Procesando...' : currentPlan === plan.name ? 'Plan Actual' : 'Seleccionar Plan'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-2">¿Necesitas más información?</h3>
        <p className="text-sm text-gray-700">Todos nuestros planes incluyen soporte para gestión de pedidos, integración con Stripe, y acceso completo al panel administrativo. Puedes cambiar de plan en cualquier momento.</p>
      </div>
    </div>
  )
}
