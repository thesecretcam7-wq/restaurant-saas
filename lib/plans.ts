// Fuente de verdad: limites por plan.
// Cualquier cambio en los planes solo se hace aqui.

export type PlanId = 'trial' | 'basic' | 'pro' | 'premium'

export interface PlanLimits {
  orders_per_month: number
  qr_menu: boolean
  pos: boolean
  comandero: boolean
  kds: boolean
  website: boolean
  kiosk: boolean
  reservations: boolean
  delivery: boolean
  analytics: boolean
  custom_domain: boolean
  multiple_locations: boolean
  exclusive_design: boolean
}

export const PLANS: Record<PlanId, { label: string; price: string; limits: PlanLimits }> = {
  trial: {
    label: 'Prueba Gratuita (30 dias)',
    price: 'Gratis',
    limits: {
      orders_per_month: Infinity,
      qr_menu: true,
      pos: true,
      comandero: true,
      kds: true,
      website: true,
      kiosk: true,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: false,
      multiple_locations: true,
      exclusive_design: true,
    },
  },
  basic: {
    label: 'Basico',
    price: 'EUR 49.99/mes',
    limits: {
      orders_per_month: 1000,
      qr_menu: true,
      pos: true,
      comandero: true,
      kds: true,
      website: false,
      kiosk: false,
      reservations: false,
      delivery: false,
      analytics: false,
      custom_domain: false,
      multiple_locations: false,
      exclusive_design: false,
    },
  },
  pro: {
    label: 'Pro',
    price: 'EUR 99.99/mes',
    limits: {
      orders_per_month: Infinity,
      qr_menu: true,
      pos: true,
      comandero: true,
      kds: true,
      website: true,
      kiosk: true,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: false,
      multiple_locations: false,
      exclusive_design: false,
    },
  },
  premium: {
    label: 'Premium',
    price: 'EUR 299.99/mes',
    limits: {
      orders_per_month: Infinity,
      qr_menu: true,
      pos: true,
      comandero: true,
      kds: true,
      website: true,
      kiosk: true,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: true,
      multiple_locations: true,
      exclusive_design: true,
    },
  },
}

export const FEATURE_MIN_PLAN: Record<keyof PlanLimits, PlanId> = {
  orders_per_month: 'basic',
  qr_menu: 'basic',
  pos: 'basic',
  comandero: 'basic',
  kds: 'basic',
  website: 'pro',
  kiosk: 'pro',
  reservations: 'pro',
  delivery: 'pro',
  analytics: 'pro',
  custom_domain: 'premium',
  multiple_locations: 'premium',
  exclusive_design: 'premium',
}

export function getPlanLimits(planId: PlanId | null | undefined): PlanLimits {
  return PLANS[planId || 'basic'].limits
}

export function getPlanLabel(planId: PlanId | null | undefined): string {
  return PLANS[planId || 'basic'].label
}
