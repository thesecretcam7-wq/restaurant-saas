import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createRatelimiter(requests: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  return new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  })
}

// Different limiters for different endpoints
export const orderLimiter = createRatelimiter(10, '1 m')   // 10 orders/min per IP
export const checkoutLimiter = createRatelimiter(20, '1 m') // 20 checkout hits/min
export const reservationLimiter = createRatelimiter(5, '1 m') // 5 reservations/min

export async function checkRateLimit(
  limiter: ReturnType<typeof createRatelimiter>,
  identifier: string
): Promise<{ allowed: boolean; remaining?: number; reset?: number }> {
  if (!limiter) return { allowed: true } // skip if not configured

  const { success, remaining, reset } = await limiter.limit(identifier)
  return { allowed: success, remaining, reset }
}

export function getClientIp(request: Request): string {
  const forwarded = (request as any).headers?.get?.('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'anonymous'
}
