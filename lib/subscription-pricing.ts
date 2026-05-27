export const TRIAL_DAYS = 30
export const ANNUAL_DISCOUNT_RATE = 0.9

export const PLAN_PRICES = {
  trial: 0,
  basic: 49.99,
  pro: 99.99,
  premium: 299.99,
  free: 0,
} as const

export const PAID_PLAN_IDS = ['basic', 'pro', 'premium'] as const

export type PaidPlanId = 'basic' | 'pro' | 'premium'
export type SubscriptionPlanId = 'trial' | 'free' | PaidPlanId

export interface PlanCatalogEntry {
  id: PaidPlanId
  name: string
  monthlyPrice: number
  annualPrice: number
  annualSavings: number
  pricingDescription: string
  landingDescription: string
  adminDescription: string
  pricingFeatures: string[]
  landingFeatures: string[]
  adminHighlights: string[]
  systemsIncluded: string[]
  cta: string
  highlight: boolean
}

export function formatPlanAmount(amount: number, fractionDigits = 2): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function getPlanMonthlyPrice(plan: string | null | undefined): number {
  return PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? 0
}

export function getPlanAnnualPrice(plan: PaidPlanId): number {
  return Math.round(PLAN_PRICES[plan] * 12 * ANNUAL_DISCOUNT_RATE * 100) / 100
}

export function getPlanAnnualSavings(plan: PaidPlanId): number {
  return Math.round((PLAN_PRICES[plan] * 12 - getPlanAnnualPrice(plan)) * 100) / 100
}

export const PLAN_CATALOG: Record<PaidPlanId, PlanCatalogEntry> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: PLAN_PRICES.basic,
    annualPrice: getPlanAnnualPrice('basic'),
    annualSavings: getPlanAnnualSavings('basic'),
    pricingDescription: 'Operacion interna para caja, meseros y cocina',
    landingDescription: 'Para empezar a digitalizar la operacion.',
    adminDescription: 'TPV, comandero y KDS para operar caja, sala y cocina desde el primer dia.',
    pricingFeatures: [
      'TPV / POS completo',
      'Carta QR incluida',
      'Comandero para meseros',
      'KDS cocina incluido',
      'Hasta 1.000 pedidos/mes',
      'Soporte por email',
    ],
    landingFeatures: ['Carta QR incluida', 'TPV / POS', 'Comandero', 'KDS cocina'],
    adminHighlights: [
      'TPV / POS completo',
      'Carta QR incluida',
      'Comandero para meseros',
      'KDS cocina incluido',
      'Hasta 1.000 pedidos/mes',
      'Soporte por email',
      'Integracion Stripe',
    ],
    systemsIncluded: ['POS', 'Carta QR', 'Comandera', 'KDS'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: PLAN_PRICES.pro,
    annualPrice: getPlanAnnualPrice('pro'),
    annualSavings: getPlanAnnualSavings('pro'),
    pricingDescription: 'Para vender tambien desde web y kiosko',
    landingDescription: 'Para vender en sala, web y autoservicio.',
    adminDescription: 'Todo el flujo operativo mas pagina web y kiosko para vender mejor.',
    pricingFeatures: [
      'Todo en Basic',
      'Pedidos ilimitados',
      'Pagina web del restaurante',
      'Kiosko autoservicio',
      'Sistema de reservas',
      'Delivery integrado',
      'Analytics avanzado',
      'Soporte prioritario',
    ],
    landingFeatures: ['Todo Basic', 'Pagina web', 'Kiosko autoservicio', 'Pedidos online'],
    adminHighlights: [
      'Todo en Basic',
      'Pagina web del restaurante',
      'Kiosko autoservicio',
      'Pedidos ilimitados',
      'Reservas y delivery',
      'Analytics avanzados',
      'Soporte prioritario',
    ],
    systemsIncluded: ['POS', 'Carta QR', 'Comandera', 'KDS', 'Pagina Web', 'Kiosko'],
    cta: 'Empezar gratis',
    highlight: true,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: PLAN_PRICES.premium,
    annualPrice: getPlanAnnualPrice('premium'),
    annualSavings: getPlanAnnualSavings('premium'),
    pricingDescription: 'Todas las funciones con experiencia visual a medida',
    landingDescription: 'Para marcas que quieren una experiencia exclusiva.',
    adminDescription: 'Todas las funciones, con disenos exclusivos adaptados a cada cliente.',
    pricingFeatures: [
      'Todo en Pro',
      'Disenos exclusivos para cada cliente',
      'Dominio personalizado',
      'Multiples sucursales',
      'Gestion avanzada de staff',
      'Programas de lealtad',
      'API access completo',
      'Integraciones personalizadas',
      'Soporte 24/7 dedicado',
      'Onboarding personalizado',
    ],
    landingFeatures: [
      'Todas las funciones',
      'Disenos exclusivos por cliente',
      'Acompanamiento premium',
      'Configuracion avanzada',
    ],
    adminHighlights: [
      'Todas las funciones del Pro',
      'Disenos exclusivos para cada cliente',
      'Dominio personalizado',
      'Multi-sucursal',
      'API access + webhooks',
      'Integraciones personalizadas',
      'Soporte 24/7 dedicado',
    ],
    systemsIncluded: ['POS', 'Carta QR', 'Comandera', 'KDS', 'Pagina Web', 'Kiosko'],
    cta: 'Empezar gratis',
    highlight: false,
  },
}

export const PUBLIC_PLAN_CARDS = PAID_PLAN_IDS.map((id) => {
  const plan = PLAN_CATALOG[id]
  return {
    id,
    name: plan.name,
    price: plan.monthlyPrice,
    desc: plan.pricingDescription,
    features: plan.pricingFeatures,
    cta: plan.cta,
    highlight: plan.highlight,
  }
})

export const LANDING_PLAN_CARDS = PAID_PLAN_IDS.map((id) => {
  const plan = PLAN_CATALOG[id]
  return {
    id,
    name: plan.name,
    price: formatPlanAmount(plan.monthlyPrice),
    annual: formatPlanAmount(plan.annualPrice),
    saving: `${formatPlanAmount(plan.annualSavings, 0)} EUR`,
    description: plan.landingDescription,
    features: plan.landingFeatures,
    featured: plan.highlight,
  }
})
