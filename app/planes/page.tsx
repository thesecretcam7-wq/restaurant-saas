'use client'

import { formatPrice } from '@/lib/currency'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    description: 'Para empezar',
    price: 29,
    currency: 'EUR',
    period: 'mes',
    features: [
      'Hasta 50 productos',
      'Panel de control',
      'Gestión de pedidos',
      'Soporte por email',
      'Dominio gratis',
    ],
    cta: 'Empezar ahora',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Profesional',
    description: 'Más popular',
    price: 79,
    currency: 'EUR',
    period: 'mes',
    features: [
      'Productos ilimitados',
      'Panel avanzado',
      'Gestión de pedidos y reservas',
      'Delivery integrado',
      'Soporte prioritario',
      'Analítica avanzada',
      'Dominio personalizado',
      'API acceso',
    ],
    cta: 'Seleccionar plan',
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para crecer',
    price: 199,
    currency: 'EUR',
    period: 'mes',
    features: [
      'Todo en Profesional',
      'Multi-ubicación',
      'Gestión de staff',
      'Programas de lealtad',
      'Integraciones personalizadas',
      'Soporte 24/7 dedicado',
      'Consultoría incluida',
      'SLA garantizado',
    ],
    cta: 'Contactar ventas',
    highlighted: false,
  },
]

interface CurrencyInfo {
  currency: string
  symbol: string
  name: string
  rate: number
  countryCode: string
}

export default function PlanesPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const response = await fetch('/api/currency-rates')
        const data = await response.json()
        setCurrencyInfo(data)
      } catch (error) {
        console.error('Error fetching currency:', error)
        // Default a EUR si hay error
        setCurrencyInfo({
          currency: 'EUR',
          symbol: '€',
          name: 'Euro',
          rate: 1,
          countryCode: 'EU',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCurrency()
  }, [])

  const getPrice = (basePrice: number) => {
    let price = basePrice
    if (billingPeriod === 'yearly') {
      price = basePrice * 12 * 0.9 // 10% descuento anual
    }
    // Convertir a moneda local
    if (currencyInfo && currencyInfo.rate) {
      return Math.round(price * currencyInfo.rate * 100) / 100
    }
    return price
  }

  const formatPriceDisplay = (price: number) => {
    if (currencyInfo && currencyInfo.currency !== 'EUR') {
      // Formato personalizado para cada moneda
      if (currencyInfo.currency === 'COP') {
        return `${currencyInfo.symbol} ${Math.round(price).toLocaleString('es-CO')}`
      } else if (currencyInfo.currency === 'JPY') {
        return `${currencyInfo.symbol} ${Math.round(price).toLocaleString('ja-JP')}`
      } else if (['USD', 'CAD', 'AUD'].includes(currencyInfo.currency)) {
        return `${currencyInfo.symbol} ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      } else {
        return `${currencyInfo.symbol} ${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }
    }
    return formatPrice(price, 'EUR')
  }

  const handleSelectPlan = (planId: string) => {
    if (planId === 'premium') {
      window.location.href = 'mailto:ventas@restaurantsaas.com?subject=Interés en plan Premium'
    } else {
      window.location.href = `/registrar?plan=${planId}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">R</div>
              <span className="font-bold text-slate-900">Restaurant SaaS</span>
            </div>
            <div className="flex gap-4">
              <Link href="/" className="text-slate-600 hover:text-slate-900">Inicio</Link>
              <Link href="/planes" className="text-blue-600 font-semibold">Planes</Link>
              <Link href="/contacto" className="text-slate-600 hover:text-slate-900">Contacto</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Planes para tu restaurante
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            Elige el plan perfecto para gestionar tu restaurante online
          </p>
          {currencyInfo && !loading && (
            <p className="text-sm text-slate-500 mb-8">
              Precios en <span className="font-semibold">{currencyInfo.name}</span> ({currencyInfo.symbol}) - Detectado para {currencyInfo.countryCode}
              {currencyInfo.currency !== 'EUR' && ' • Basado en tasas de cambio actuales'}
            </p>
          )}

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Anual <span className="ml-2 text-sm text-green-600 font-bold">-10%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const displayPrice = getPrice(plan.price)
            const yearlyTotal = billingPeriod === 'yearly' ? displayPrice * 12 : null

            return (
              <div
                key={plan.id}
                className={`rounded-2xl overflow-hidden transition-all ${
                  plan.highlighted
                    ? 'ring-2 ring-blue-600 shadow-2xl scale-105'
                    : 'shadow-lg hover:shadow-xl'
                } ${plan.highlighted ? 'bg-blue-50' : 'bg-white'}`}
              >
                {/* Header */}
                <div className={`px-6 py-8 ${plan.highlighted ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-slate-50'}`}>
                  {plan.highlighted && (
                    <div className="inline-block bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full mb-3">
                      MÁS POPULAR
                    </div>
                  )}
                  <h3 className={`text-2xl font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${plan.highlighted ? 'text-blue-100' : 'text-slate-600'}`}>
                    {plan.description}
                  </p>
                </div>

                {/* Pricing */}
                <div className="px-6 py-8">
                  <div className="mb-6">
                    <div className="text-5xl font-bold text-slate-900">
                      {formatPriceDisplay(displayPrice)}
                    </div>
                    <div className="text-slate-600 mt-2">
                      por {plan.period}
                      {billingPeriod === 'yearly' && yearlyTotal && (
                        <div className="text-sm text-slate-500 mt-1">
                          ({formatPriceDisplay(yearlyTotal)}/año)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16 sm:py-24 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Preguntas frecuentes</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Puedo cambiar de plan?</h3>
              <p className="text-slate-600">Sí, puedes cambiar de plan en cualquier momento. Los cambios se aplican en tu próximo ciclo de facturación.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Hay período de prueba?</h3>
              <p className="text-slate-600">Ofrecemos 14 días de prueba gratuita en cualquier plan. No se requiere tarjeta de crédito.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Qué métodos de pago aceptan?</h3>
              <p className="text-slate-600">Aceptamos tarjetas de crédito, transferencia bancaria y PayPal. Los pagos se procesan de forma segura con Stripe.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Hay descuentos para facturación anual?</h3>
              <p className="text-slate-600">Sí, ofrecemos un 10% de descuento si pagas por año completo en lugar de mes a mes.</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Necesito contrato a largo plazo?</h3>
              <p className="text-slate-600">No, puedes cancelar en cualquier momento sin penalidades. Somos flexibles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            Gestiona tu restaurante en línea con Restaurant SaaS
          </p>
          <Link
            href="/registrar"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
          >
            Registrarse ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-400">© 2026 Restaurant SaaS. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
