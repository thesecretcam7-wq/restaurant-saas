'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 29,
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
    name: 'Pro',
    price: 79,
    desc: 'El más popular — todo lo que necesitas',
    features: [
      'Todo en Básico',
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
    name: 'Premium',
    price: 199,
    desc: 'Para cadenas y franquicias',
    features: [
      'Todo en Pro',
      'Múltiples sucursales',
      'Gestión de staff',
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

function formatPrice(amount: number, currency: CurrencyInfo | null, yearly: boolean): string {
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
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-black">R</div>
            <span className="font-bold text-white text-lg tracking-tight">RestaurantOS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="/#features" className="hover:text-white transition-colors">Funciones</Link>
            <Link href="/#how" className="hover:text-white transition-colors">Cómo funciona</Link>
            <Link href="/planes" className="text-orange-400 font-semibold">Precios</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">Iniciar sesión</Link>
            <Link href="/registrar" className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">

          {/* HEADER */}
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-4">Precios</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
              Simple y transparente
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-2">
              Sin comisiones por venta. Pagas solo el plan. Cancela cuando quieras.
            </p>
            {currency && (
              <p className="text-sm text-gray-500">
                Precios en <span className="text-orange-400 font-semibold">{currency.name} ({currency.symbol})</span>
                {currency.currency !== 'EUR' && ' · Basado en tasas actuales'}
                {' · Detectado para '}{currency.countryCode}
              </p>
            )}

            {/* Toggle mensual/anual */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!yearly ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Mensual
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                Anual
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">−10%</span>
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`rounded-2xl p-7 border relative flex flex-col transition-all ${
                  plan.highlight
                    ? 'bg-orange-500/10 border-orange-500/40 shadow-2xl shadow-orange-500/10 scale-[1.02]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-orange-500 text-white text-xs font-black tracking-wide shadow-lg shadow-orange-500/40">
                      MÁS POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-sm font-bold mb-1 ${plan.highlight ? 'text-orange-400' : 'text-gray-400'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-5xl font-black text-white">
                      {formatPrice(plan.price, currency, yearly)}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">/mes {yearly && '· facturado anual'}</p>
                  <p className="text-xs text-gray-600 mt-1">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <svg className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-orange-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.id === 'premium' ? 'mailto:ventas@restaurantos.com?subject=Plan Premium' : '/registrar'}
                  className={`block w-full py-3.5 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${
                    plan.highlight
                      ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* TRIAL NOTE */}
          <p className="text-center text-sm text-gray-500">
            Todos los planes incluyen <span className="text-white font-semibold">14 días de prueba gratis</span> · Sin tarjeta de crédito · Cancela cuando quieras
          </p>

          {/* FEATURE COMPARISON */}
          <div className="mt-24">
            <h2 className="text-3xl font-black text-center mb-10">¿Qué incluye cada plan?</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 text-gray-400 font-medium w-1/2">Función</th>
                    <th className="text-center py-4 text-gray-400 font-medium">Básico</th>
                    <th className="text-center py-4 text-orange-400 font-bold">Pro</th>
                    <th className="text-center py-4 text-gray-400 font-medium">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
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
                    <tr key={feature as string} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 text-gray-300">{feature as string}</td>
                      <td className="py-3.5 text-center">{renderCell(basic)}</td>
                      <td className="py-3.5 text-center">{renderCell(pro, true)}</td>
                      <td className="py-3.5 text-center">{renderCell(premium)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-24 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-center mb-10">Preguntas frecuentes</h2>
            <div className="space-y-5">
              {[
                ['¿Hay período de prueba?', '14 días gratis en cualquier plan. Sin tarjeta de crédito. Sin compromisos.'],
                ['¿Puedo cambiar de plan?', 'Sí, puedes subir o bajar de plan en cualquier momento desde tu panel. Los cambios aplican en el siguiente ciclo.'],
                ['¿Qué pasa si cancelo?', 'Puedes cancelar cuando quieras. No hay penalidades ni cargos ocultos.'],
                ['¿Cómo funciona el pago?', 'Procesamos pagos con Stripe. Aceptamos tarjetas de crédito/débito de todos los países.'],
                ['¿Puedo conectar mi propio dominio?', 'Sí, desde el plan Pro puedes conectar tu dominio propio (ej: mipizzeria.com) con instrucciones paso a paso.'],
              ].map(([q, a]) => (
                <div key={q} className="border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
                  <p className="font-bold text-white mb-2">{q}</p>
                  <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA FINAL */}
          <div className="mt-24 text-center">
            <div className="inline-block p-px rounded-2xl bg-gradient-to-r from-orange-500/50 to-orange-600/50">
              <div className="bg-[#0A0A0A] rounded-2xl px-12 py-10">
                <h2 className="text-3xl font-black mb-3">¿Listo para empezar?</h2>
                <p className="text-gray-400 mb-7">14 días gratis. Sin tarjeta. Sin sorpresas.</p>
                <Link
                  href="/registrar"
                  className="inline-block px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-all text-lg shadow-xl shadow-orange-500/30 active:scale-95"
                >
                  Crear mi restaurante gratis →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-black">R</div>
            <span className="text-sm text-gray-500">RestaurantOS © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <Link href="/planes" className="hover:text-white transition-colors">Precios</Link>
            <Link href="/registrar" className="hover:text-white transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function renderCell(value: boolean | string, highlight = false) {
  if (value === true) {
    return (
      <svg className={`w-5 h-5 mx-auto ${highlight ? 'text-orange-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (value === false) {
    return <span className="text-gray-700">—</span>
  }
  return <span className={`text-xs font-semibold ${highlight ? 'text-orange-400' : 'text-gray-400'}`}>{value}</span>
}
