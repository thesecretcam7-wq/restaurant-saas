import type { Ratelimit } from '@upstash/ratelimit'
import {
  applyRateLimit,
  getCheckoutLimiter,
  getClientIp,
  getOrderSubmissionLimiter,
  getReservationLimiter,
} from './rate-limit'

export const orderLimiter = getOrderSubmissionLimiter()
export const checkoutLimiter = getCheckoutLimiter()
export const reservationLimiter = getReservationLimiter()

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; remaining?: number; reset?: number }> {
  const result = await applyRateLimit(limiter, identifier)

  return {
    allowed: !result.limited,
    remaining: result.headers['X-RateLimit-Remaining']
      ? Number(result.headers['X-RateLimit-Remaining'])
      : undefined,
    reset: result.headers['X-RateLimit-Reset']
      ? Number(result.headers['X-RateLimit-Reset'])
      : undefined,
  }
}

export { getClientIp }
