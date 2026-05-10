'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SubscriptionPlan } from '@/lib/types'

interface Props { params: Promise<{ domain: string }> }

interface CurrencyInfo {
  currency: string
  symbol: string
  name: string
  rate: number
  countryCode: string
}

interface SystemFeature {
  name: string
  description: string
  icon: string
}

const SYSTEM_FEATURES: SystemFeature[] = [
  { name: 'POS', icon: 'POS', description: 'Sistema de Punto de Venta' },
  { name: 'Comandera', icon: 'CMD', description: 'Control de Meseros' },
  { name: 'KDS', icon: 'KDS', description: 'Pantalla de Cocina' },
  { name: 'Kiosko', icon: 'KIO', description: 'Autoservicio en tienda' }
]

const planHighlights: { [key: string]: string[] } = {
  basic: [
    '✓ POS completo',
    '✓ KDS cocina incluido',
    '✓ Hasta 100 productos',
    '✓ Reportes básicos',
    '✓ Soporte por email',
    '✓ Integración Stripe'
  ],
  pro: [
    '✓ POS y Comandera',
    '✓ Kiosko autoservicio',
    '✓ Hasta 500 productos',
    '✓ Analytics avanzados',
    '✓ Soporte prioritario',
    '✓ Custom domain',
    '✓ API access'
  ],
  premium: [
    '✓ Sistema completo POS + Comandera + KDS + Kiosko',
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
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null)
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, currencyRes] = await Promise.all([
          fetch(`/api/subscription-plans`),
          fetch('/api/currency-rates'),
        ])
        const plansData = await plansRes.json()
        const currencyData = await currencyRes.json()
        setPlans(plansData)
        if (!currencyData.error) setCurrency(currencyData)
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
    setProcessingPlan(`${planName}-${billingInterval}`)
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, planName, billingInterval }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.url) window.location.href = data.url
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al procesar')
    } finally {
      setProcessingPlan(null)
    }
  }

  const planDescriptions: { [key: string]: string } = {
    basic: 'POS completo con KDS para empezar con caja y cocina conectadas.',
    pro: 'Solución integral con Comandera y Kiosko. Para restaurantes con operaciones en crecimiento',
    premium: 'Ecosistema completo: POS + Comandera + KDS + Kiosko. Máximo control y eficiencia operacional'
  }

  const planSubtitles: { [key: string]: string } = {
    basic: 'Comienza tu transformación digital',
    pro: 'Crece con confianza y control',
    premium: 'Domina tu operación completa'
  }

  const systemsIncluded: { [key: string]: string[] } = {
    basic: ['POS', 'KDS'],
    pro: ['POS', 'Comandera', 'KDS', 'Kiosko'],
    premium: ['POS', 'Comandera', 'KDS', 'Kiosko']
  }

  const formatSubscriptionPrice = (amount: number) => {
    const currencyCode = currency?.currency || 'EUR'
    const rate = currency?.rate || 1
    const convertedAmount = currencyCode === 'EUR' ? amount : amount * rate
    const zeroDecimalCurrencies = ['COP', 'CLP', 'JPY', 'VND', 'IDR']

    return new Intl.NumberFormat(currencyCode === 'EUR' ? 'es-ES' : 'es-CO', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: zeroDecimalCurrencies.includes(currencyCode) ? 0 : 2,
      minimumFractionDigits: zeroDecimalCurrencies.includes(currencyCode) ? 0 : 2,
    }).format(convertedAmount)
  }

  const getPlanPrice = (plan: SubscriptionPlan) => {
    if (billingInterval === 'year' && plan.annual_price) {
      return Number(plan.annual_price)
    }
    return Number(plan.monthly_price)
  }

  const getAnnualSavings = (plan: SubscriptionPlan) => {
    const annualPrice = Number(plan.annual_price || 0)
    if (!annualPrice) return 0
    return Math.max(0, Number(plan.monthly_price) * 12 - annualPrice)
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

  if (loading) return <div className="admin-panel flex h-48 items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-4 border-black/10 border-t-[#e43d30]" /></div>

  return (
    <div className="max-w-6xl space-y-6">
      <div className="admin-panel p-6">
        <p className="admin-eyebrow">Suscripcion</p>
        <h2 className="admin-title">Planes de Suscripción</h2>
        <p className="admin-subtitle">Elige el plan que mejor se adapta a tu restaurante</p>
        {currency && (
          <p className="mt-3 text-sm font-bold text-black/50">
            Precios mostrados en {currency.name} ({currency.currency}) segun tu pais: {currency.countryCode}.
          </p>
        )}
        <div className="mt-5 inline-flex rounded-xl border border-black/10 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingInterval('month')}
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              billingInterval === 'month' ? 'bg-[#15130f] text-white' : 'text-black/58 hover:bg-black/[0.04]'
            }`}
          >
            Mensual
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('year')}
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              billingInterval === 'year' ? 'bg-[#15130f] text-white' : 'text-black/58 hover:bg-black/[0.04]'
            }`}
          >
            Anual <span className="ml-1 text-xs">-10%</span>
          </button>
        </div>
      </div>

      {currentPlan && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span className="font-medium">Plan actual:</span> <strong className="capitalize">{currentPlan}</strong>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        {plans.map(plan => {
          const systems = systemsIncluded[plan.name] || []
          const highlights = planHighlights[plan.name] || []
          const planPrice = getPlanPrice(plan)
          const annualSavings = getAnnualSavings(plan)
          const canSelectInterval = billingInterval === 'month' || Boolean(plan.stripe_annual_price_id)
          const processingKey = `${plan.name}-${billingInterval}`

          return (
            <div key={plan.id} className={`admin-card overflow-hidden p-0 transition-all hover:shadow-lg ${
              currentPlan === plan.name
                ? 'ring-2 ring-[#e43d30] border-[#e43d30]'
                : 'hover:border-black/18'
            }`}>
              {currentPlan === plan.name && (
                <div className="bg-[#15130f] px-6 py-2 text-center text-xs font-semibold text-white">
                  PLAN ACTUAL
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold capitalize text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-6">{planDescriptions[plan.name]}</p>

                <div className="mb-8 pb-8 border-b">
                  <p className="text-4xl font-bold text-gray-900">
                    {formatSubscriptionPrice(planPrice)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {billingInterval === 'year' ? 'por año' : 'por mes'}
                  </p>
                  {billingInterval === 'year' && annualSavings > 0 && (
                    <p className="mt-2 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      Ahorras {formatSubscriptionPrice(annualSavings)} al año
                    </p>
                  )}
                  {currency?.currency && currency.currency !== 'EUR' && (
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      aprox. desde {planPrice.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  )}
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
                              ? 'bg-red-50/70 border-2 border-red-200'
                              : 'bg-gray-50 border-2 border-gray-100 opacity-40'
                          }`}
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <p className="text-xs font-bold text-gray-900">{feature.name}</p>
                          <p className={`text-xs mt-1 ${isIncluded ? 'text-red-700' : 'text-gray-500'}`}>
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
                  disabled={processingPlan !== null || currentPlan === plan.name || !canSelectInterval}
                  className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                    currentPlan === plan.name
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : !canSelectInterval
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : processingPlan === processingKey
                        ? 'bg-red-300 text-white cursor-wait'
                        : 'bg-[#e43d30] hover:bg-[#c9271d] text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {processingPlan === processingKey
                    ? 'Procesando...'
                    : currentPlan === plan.name
                      ? 'Plan Actual'
                      : !canSelectInterval
                        ? 'Pago anual no configurado'
                        : billingInterval === 'year'
                          ? 'Pagar anual'
                          : 'Seleccionar Plan'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="admin-panel p-6">
        <h3 className="font-bold text-gray-900 mb-2">¿Necesitas más información?</h3>
        <p className="text-sm text-gray-700">Todos nuestros planes incluyen soporte para gestión de pedidos, integración con Stripe, y acceso completo al panel administrativo. Puedes cambiar de plan en cualquier momento.</p>
      </div>
    </div>
  )
}

