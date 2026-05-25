export const PLAN_PRICES = {
  trial: 0,
  basic: 49.99,
  pro: 99.99,
  premium: 299.99,
  free: 0,
} as const

export type PaidPlanId = 'basic' | 'pro' | 'premium'

export function getPlanMonthlyPrice(plan: string | null | undefined): number {
  return PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? 0
}

export function getPlanAnnualPrice(plan: PaidPlanId): number {
  return Math.round(PLAN_PRICES[plan] * 12 * 0.9 * 100) / 100
}
