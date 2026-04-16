'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANS = [
  {
    id: 'basic',
    name: 'Essentials',
    price: 39,
    desc: 'Para restaurantes que empiezan',
    features: [
      'Menú digital ilimitado',
      'Hasta 100 pedidos/mes',
      'Panel de administración',
      'Soporte por email',
      'Dominio gratis incluido',
      'PWA instalable',
    ],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 99,
    desc: 'El más popular — todo lo que necesitas',
    features: [
      'Todo en Essentials',
      'Pedidos ilimitados',
      'Sistema de reservas',
      'Delivery integrado',
      'Analytics avanzado',
      'Dominio personalizado',
      'Sistema mesero / cocina',
      'Soporte prioritario',
    ],
    cta: 'Empezar gratis',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Enterprise',
    price: null,
    desc: 'Para cadenas y franquicias',
    features: [
      'Todo en Professional',
      'Múltiples sucursales',
      'Gestión avanzada de staff',
      'Programas de lealtad',
      'API access completo',
      'Integraciones personalizadas',
      'Soporte 24/7 dedicado',
      'Onboarding personalizado',
    ],
    cta: 'Hablar con ventas',
    highlight: false,
  },
]

interface CurrencyInfo {
  currency: string
  symbol: string
  name: string
  rate: number
  countryCode: string
}

function formatPrice(amount: number | null, currency: CurrencyInfo | null, yearly: boolean): string {
  if (amount === null) return 'Precio personalizado'

  let price = amount
  if (yearly) price = amount * 12 * 0.9
  if (currency && currency.rate && currency.currency !== 'EUR') {
    price = price * currency.rate
  }

  if (!currency || currency.currency === 'EUR') {
    return `€${Math.round(price).toLocaleString('es-ES')}`
  }
  if (['COP', 'CLP', 'JPY', 'VND', 'IDR'].includes(currency.currency)) {
    return `${currency.symbol} ${Math.round(price).toLocaleString('es-CO')}`
  }
  return `${currency.symbol} ${price.toFixed(2)}`
}

export default function PlanesPage() {
  const [yearly, setYearly] = useState(false)
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null)

  useEffect(() => {
    fetch('/api/currency-rates')
      .then(r => r.json())
      .then(d => setCurrency(d))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/50 to-green-50/50 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-green-100/20 rounded-full blur-3xl" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between relative z-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-sm font-black text-white">E</div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Eccofood</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <Link href="/#features" className="hover:text-gray-900 transition-colors">Funciones</Link>
            <Link href="/#how" className="hover:text-gray-900 transition-colors">Cómo funciona</Link>
            <Link href="/planes" className="text-blue-600 font-semibold">Precios</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden md:block">Iniciar sesión</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white text-sm font-bold transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">

          {/* HEADER */}
          <div className="text-center mb-16 animate-fade-in">
            <p className="text-orange-600 text-sm font-semibold uppercase tracking-widest mb-4">Precios</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-gray-900">
              Transparente y justo
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto mb-2">
              Sin comisiones por venta. Pagas solo el plan. Cancela cuando quieras.
            </p>
            {currency && (
              <p className="text-sm text-gray-500">
                Precios en <span className="text-blue-600 font-semibold">{currency.name} ({currency.symbol})</span>
                {currency.currency !== 'EUR' && ' · Basado en tasas actuales'}
                {' · Detectado para '}{currency.countryCode}
              </p>
            )}

            {/* Toggle mensual/anual */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!yearly ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Anual
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">−10%</span>
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 border relative flex flex-col transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-blue-50 to-green-50/50 border-blue-200/80 shadow-2xl shadow-blue-500/10 lg:scale-105'
                    : 'bg-white/60 border-gray-200/60 hover:border-gray-300/80 hover:shadow-lg'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-green-600 text-white text-xs font-black tracking-wide shadow-lg">
                      MÁS ELEGIDO
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-sm font-bold mb-2 ${plan.highlight ? 'text-blue-600' : 'text-gray-600'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    {plan.price !== null ? (
                      <>
                        <span className="text-5xl font-black text-gray-900">
                          {formatPrice(plan.price, currency, yearly)}
                        </span>
                        <span className="text-gray-600 text-sm">/mes</span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-gray-900">Personalizado</span>
                    )}
                  </div>
                  {yearly && plan.price !== null && <p className="text-gray-500 text-sm">facturado anual</p>}
                  <p className="text-sm text-gray-600 mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <svg className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-green-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.id === 'premium' ? 'mailto:ventas@eccofood.com?subject=Plan Enterprise' : '/register'}
                  className={`block w-full py-3.5 rounded-lg text-sm font-bold text-center transition-all active:scale-95 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* TRIAL NOTE */}
          <p className="text-center text-sm text-gray-600">
            Todos los planes incluyen <span className="text-gray-900 font-semibold">14 días de prueba gratis</span> · Sin tarjeta de crédito · Cancela cuando quieras
          </p>

          {/* FEATURE COMPARISON */}
          <div className="mt-24">
            <h2 className="text-3xl font-black text-center mb-10 text-gray-900">¿Qué incluye cada plan?</h2>
            <div className="overflow-x-auto rounded-2xl border border-gray-200/60">
              <table className="w-full text-sm bg-white/60 backdrop-blur-sm">
                <thead>
                  <tr className="border-b border-gray-200/60">
                    <th className="text-left py-4 px-6 text-gray-700 font-semibold w-1/2">Función</th>
                    <th className="text-center py-4 px-4 text-gray-700 font-semibold">Essentials</th>
                    <th className="text-center py-4 px-4 text-blue-600 font-bold">Professional</th>
                    <th className="text-center py-4 px-4 text-gray-700 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/40">
                  {[
                    ['Menú digital', true, true, true],
                    ['Pedidos online', '100/mes', 'Ilimitados', 'Ilimitados'],
                    ['Panel administración', true, true, true],
                    ['Sistema de reservas', false, true, true],
                    ['Delivery integrado', false, true, true],
                    ['Analytics avanzado', false, true, true],
                    ['Dominio personalizado', false, true, true],
                    ['Sistema mesero / cocina', false, true, true],
                    ['Múltiples sucursales', false, false, true],
                    ['API access', false, false, true],
                    ['Onboarding personalizado', false, false, true],
                    ['Soporte', 'Email', 'Prioritario', '24/7 dedicado'],
                  ].map(([feature, basic, pro, premium]) => (
                    <tr key={feature as string} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-6 text-gray-700">{feature as string}</td>
                      <td className="py-3.5 px-4 text-center">{renderCell(basic)}</td>
                      <td className="py-3.5 px-4 text-center">{renderCell(pro, true)}</td>
                      <td className="py-3.5 px-4 text-center">{renderCell(premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-24 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-10 text-gray-900">Preguntas frecuentes</h2>
            <div className="space-y-5">
              {[
                ['¿Hay período de prueba?', '14 días gratis en cualquier plan. Sin tarjeta de crédito. Sin compromisos.'],
                ['¿Puedo cambiar de plan?', 'Sí, puedes subir o bajar de plan en cualquier momento desde tu panel. Los cambios aplican en el siguiente ciclo.'],
                ['¿Qué pasa si cancelo?', 'Puedes cancelar cuando quieras. No hay penalidades ni cargos ocultos.'],
                ['¿Cómo funciona el pago?', 'Procesamos pagos con Stripe. Aceptamos tarjetas de crédito/débito de todos los países.'],
                ['¿Puedo conectar mi propio dominio?', 'Sí, desde el plan Professional puedes conectar tu dominio propio (ej: mipizzeria.com) con instrucciones paso a paso.'],
              ].map(([q, a]) => (
                <div key={q} className="border border-gray-200/60 rounded-2xl p-6 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors">
                  <p className="font-bold text-gray-900 mb-2">{q}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA FINAL */}
          <div className="mt-24 text-center">
            <div className="inline-block p-px rounded-2xl bg-gradient-to-r from-blue-200/40 to-green-200/40">
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-12 py-10">
                <h2 className="text-3xl font-black mb-3 text-gray-900">¿Listo para empezar?</h2>
                <p className="text-gray-600 mb-7">14 días gratis. Sin tarjeta. Sin sorpresas.</p>
                <Link
                  href="/register"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold rounded-xl transition-all text-lg shadow-lg hover:shadow-xl"
                >
                  Crear mi restaurante gratis →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-200/50 py-8 px-6 bg-white/40 backdrop-blur-sm relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-xs font-black text-white">E</div>
            <span className="text-sm text-gray-600">Eccofood © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Inicio</Link>
            <Link href="/planes" className="hover:text-gray-900 transition-colors">Precios</Link>
            <Link href="/register" className="hover:text-gray-900 transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function renderCell(value: boolean | string, highlight = false) {
  if (value === true) {
    return (
      <svg className={`w-5 h-5 mx-auto ${highlight ? 'text-green-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (value === false) {
    return <span className="text-gray-400">—</span>
  }
  return <span className={`text-xs font-semibold ${highlight ? 'text-green-600' : 'text-gray-600'}`}>{value}</span>
}
