// ─── FUENTE DE VERDAD: LÍMITES POR PLAN ───────────────────────────────────
// Cualquier cambio en los planes solo se hace aquí.

export type PlanId = 'trial' | 'basic' | 'pro' | 'premium'

export interface PlanLimits {
  orders_per_month: number        // Infinity = ilimitado
  reservations: boolean           // Sistema de reservas
  delivery: boolean               // Módulo de delivery
  analytics: boolean              // Página de ventas/analytics
  custom_domain: boolean          // Dominio personalizado
  multiple_locations: boolean     // Múltiples sucursales
}

export const PLANS: Record<PlanId, { label: string; price: string; limits: PlanLimits }> = {
  trial: {
    label: 'Prueba Gratuita',
    price: 'Gratis',
    limits: {
      orders_per_month: 50,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: false,
      multiple_locations: false,
    },
  },
  basic: {
    label: 'Básico',
    price: '$29.900/mes',
    limits: {
      orders_per_month: 100,
      reservations: false,
      delivery: false,
      analytics: false,
      custom_domain: false,
      multiple_locations: false,
    },
  },
  pro: {
    label: 'Pro',
    price: '$59.900/mes',
    limits: {
      orders_per_month: Infinity,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: true,
      multiple_locations: false,
    },
  },
  premium: {
    label: 'Premium',
    price: '$99.900/mes',
    limits: {
      orders_per_month: Infinity,
      reservations: true,
      delivery: true,
      analytics: true,
      custom_domain: true,
      multiple_locations: true,
    },
  },
}

// Qué plan mínimo se necesita para cada feature
export const FEATURE_MIN_PLAN: Record<keyof PlanLimits, PlanId> = {
  orders_per_month: 'basic',
  reservations: 'pro',
  delivery: 'pro',
  analytics: 'pro',
  custom_domain: 'pro',
  multiple_locations: 'premium',
}

export function getPlanLimits(planId: PlanId | null | undefined): PlanLimits {
  return PLANS[planId || 'basic'].limits
}

export function getPlanLabel(planId: PlanId | null | undefined): string {
  return PLANS[planId || 'basic'].label
}
