'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import EccofoodLogo from '@/components/EccofoodLogo'
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher'

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 39,
    desc: 'Para restaurantes que empiezan',
    features: [
      'Menú digital ilimitado',
      'Hasta 100 pedidos/mes',
      'Panel de administración',
      'KDS cocina incluido',
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
    price: 99,
    desc: 'El más popular — todo lo que necesitas',
    features: [
      'Todo en Basic',
      'Pedidos ilimitados',
      'Sistema de reservas',
      'Delivery integrado',
      'Kiosko autoservicio',
      'Analytics avanzado',
      'Sistema mesero / cocina',
      'Soporte prioritario',
    ],
    cta: 'Empezar gratis',
    highlight: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    desc: 'Para cadenas, franquicias y operaciones avanzadas',
    features: [
      'Todo en Pro',
      'Dominio personalizado',
      'Múltiples sucursales',
      'Gestión avanzada de staff',
      'Programas de lealtad',
      'API access completo',
      'Integraciones personalizadas',
      'Soporte 24/7 dedicado',
      'Onboarding personalizado',
    ],
    cta: 'Empezar gratis',
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
  const { tr } = useI18n()

  useEffect(() => {
    fetch('/api/currency-rates')
      .then(r => r.json())
      .then(d => setCurrency(d))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background gradient blobs */}
      <div className="fixed top-[-5%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-primary/15 to-secondary/8 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 -right-40 w-[400px] h-[400px] bg-accent/8 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/2 -left-40 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <EccofoodLogo size="sm" textClassName="font-bold text-foreground text-lg tracking-tight" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="/#features" className="hover:text-foreground transition-colors">{tr('landing.nav.features')}</Link>
            <Link href="/#how" className="hover:text-foreground transition-colors">Cómo funciona</Link>
            <Link href="/planes" className="text-primary font-semibold">{tr('pricing.eyebrow')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact className="hidden border-border bg-card/80 md:inline-flex" />
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:block">Iniciar sesión</Link>
            <Link href="/register" className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white text-sm font-bold transition-all shadow-lg shadow-primary/30 active:scale-95">
              {tr('common.startFree')}
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">

          {/* HEADER */}
          <div className="text-center mb-16 animate-fade-in">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-4">{tr('pricing.eyebrow')}</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 text-foreground">
              {tr('pricing.title')}
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-2">
              {tr('pricing.subtitle')}
            </p>
            {currency && (
              <p className="text-sm text-muted-foreground">
                Precios en <span className="text-primary font-semibold">{currency.name} ({currency.symbol})</span>
                {currency.currency !== 'EUR' && ' · Basado en tasas actuales'}
                {' · Detectado para '}{currency.countryCode}
              </p>
            )}

            {/* Toggle mensual/anual */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setYearly(false)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!yearly ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tr('pricing.monthly')}
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${yearly ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tr('pricing.yearly')}
                <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-xs font-bold">−10%</span>
              </button>
            </div>
          </div>

          {/* CARDS */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-8 border relative flex flex-col transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-primary/15 to-secondary/10 border-primary/40 shadow-xl shadow-primary/10 lg:scale-105'
                    : 'bg-card/50 border-border hover:border-border/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-black tracking-wide shadow-lg shadow-primary/30">
                      ⭐ MÁS ELEGIDO
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`text-sm font-bold mb-2 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    {plan.price !== null ? (
                      <>
                        <span className="text-5xl font-black text-foreground">
                          {formatPrice(plan.price, currency, yearly)}
                        </span>
                        <span className="text-muted-foreground text-sm mb-2">{yearly ? '/año' : '/mes'}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-foreground">{tr('common.customPrice')}</span>
                    )}
                  </div>
                  {yearly && plan.price !== null && <p className="text-muted-foreground text-sm">{tr('common.yearlyBilled')}</p>}
                  <p className="text-sm text-muted-foreground mt-2">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <svg className={`w-5 h-5 flex-shrink-0 ${plan.highlight ? 'text-accent' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${plan.id}${yearly ? '&billing=year' : ''}`}
                  className={`block w-full py-3.5 rounded-lg text-sm font-bold text-center transition-all active:scale-95 hover:-translate-y-0.5 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-primary via-secondary to-primary text-white shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/50'
                      : 'bg-muted/50 hover:bg-muted text-foreground border border-border/50 hover:border-primary/30'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* TRIAL NOTE */}
          <p className="text-center text-sm text-muted-foreground">
            Todos los planes incluyen <span className="text-foreground font-semibold">30 días de prueba gratis</span> · Sin tarjeta de crédito · Cancela cuando quieras
          </p>

          {/* FEATURE COMPARISON */}
          <div className="mt-24">
            <h2 className="text-3xl font-black text-center mb-10 text-foreground">¿Qué incluye cada plan?</h2>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm bg-card/50 backdrop-blur-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-6 text-muted-foreground font-semibold w-1/2">Función</th>
                    <th className="text-center py-4 px-4 text-muted-foreground font-semibold">Basic</th>
                    <th className="text-center py-4 px-4 text-primary font-bold">Pro</th>
                    <th className="text-center py-4 px-4 text-muted-foreground font-semibold">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ['Menú digital', true, true, true],
                    ['Pedidos online', '100/mes', 'Ilimitados', 'Ilimitados'],
                    ['Panel administración', true, true, true],
                    ['Sistema de reservas', false, true, true],
                    ['Delivery integrado', false, true, true],
                    ['KDS cocina', true, true, true],
                    ['Kiosko autoservicio', false, true, true],
                    ['Analytics avanzado', false, true, true],
                    ['Dominio personalizado', false, false, true],
                    ['Sistema mesero / comandera', false, true, true],
                    ['Múltiples sucursales', false, false, true],
                    ['API access', false, false, true],
                    ['Onboarding personalizado', false, false, true],
                    ['Soporte', 'Email', 'Prioritario', '24/7 dedicado'],
                  ].map(([feature, basic, pro, premium]) => (
                    <tr key={feature as string} className="hover:bg-primary/5 transition-colors">
                      <td className="py-3.5 px-6 text-foreground">{feature as string}</td>
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
            <h2 className="text-3xl font-black text-center mb-10 text-foreground">{tr('pricing.faqTitle')}</h2>
            <div className="space-y-5">
              {[
                ['¿Hay período de prueba?', '30 días gratis en cualquier plan. Sin tarjeta de crédito. Sin compromisos.'],
                ['¿Puedo cambiar de plan?', 'Sí, puedes subir o bajar de plan en cualquier momento desde tu panel. Los cambios aplican en el siguiente ciclo.'],
                ['¿Qué pasa si cancelo?', 'Puedes cancelar cuando quieras. No hay penalidades ni cargos ocultos.'],
                ['¿Cómo funciona el pago?', 'Procesamos pagos con Stripe. Aceptamos tarjetas de crédito/débito de todos los países.'],
                ['¿Puedo conectar mi propio dominio?', 'Sí, desde el plan Premium puedes conectar tu dominio propio (ej: mipizzeria.com) con instrucciones paso a paso.'],
              ].map(([q, a]) => (
                <div key={q} className="border border-border rounded-2xl p-6 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <p className="font-bold text-foreground mb-2">{q}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA FINAL */}
          <div className="mt-24 text-center">
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-12 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-3 text-foreground">¿Listo para empezar?</h2>
                <p className="text-muted-foreground mb-7">30 días gratis. Sin tarjeta. Sin sorpresas.</p>
                <Link
                  href="/register"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-primary via-secondary to-primary hover:from-primary/90 hover:via-secondary/90 hover:to-primary/90 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 active:scale-95 hover:-translate-y-1"
                >
                  🚀 Crear mi restaurante gratis →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border py-8 px-6 bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <EccofoodLogo size="xs" showText={false} />
            <span className="text-sm text-muted-foreground">Eccofood © 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Inicio</Link>
            <Link href="/planes" className="hover:text-foreground transition-colors">Precios</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function renderCell(value: boolean | string, highlight = false) {
  if (value === true) {
    return (
      <svg className={`w-5 h-5 mx-auto ${highlight ? 'text-accent' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }
  if (value === false) {
    return <span className="text-muted-foreground/50">—</span>
  }
  return <span className={`text-xs font-semibold ${highlight ? 'text-secondary' : 'text-muted-foreground'}`}>{value}</span>
}
