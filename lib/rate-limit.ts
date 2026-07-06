import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
type RateLimitWindow = `${number} ${'s' | 'm' | 'h' | 'd'}`
const RATE_LIMIT_TIMEOUT_MS = 750

function hasUpstashEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return !!url && /^https?:\/\//.test(url) && !!token
}

function getRedis(): Redis | null {
  if (!hasUpstashEnv()) return null
  if (!redis) {
    redis = Redis.fromEnv()
  }
  return redis
}

function createLimiter(
  requests: number,
  window: RateLimitWindow,
  prefix: string,
  analytics = false
) {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
    analytics,
  })
}

// 500 req/min - general DDoS protection.
export function getGlobalLimiter() {
  return createLimiter(500, '1 m', 'eccofood:global')
}

// 5 req/min - login/register brute-force protection.
export function getAuthLimiter() {
  return createLimiter(5, '1 m', 'eccofood:auth')
}

// 10 req/min - cost protection on AI endpoints.
export function getAiLimiter() {
  return createLimiter(10, '1 m', 'eccofood:ai')
}

// 20 req/min - order spam protection.
export function getOrdersLimiter() {
  return createLimiter(20, '1 m', 'eccofood:orders')
}

// 10 req/min - public order creation protection.
export function getOrderSubmissionLimiter() {
  return createLimiter(10, '1 m', 'eccofood:order-submissions', true)
}

// 20 req/min - checkout and customer lookup protection.
export function getCheckoutLimiter() {
  return createLimiter(20, '1 m', 'eccofood:checkout', true)
}

// 5 req/min - public reservations protection.
export function getReservationLimiter() {
  return createLimiter(5, '1 m', 'eccofood:reservations', true)
}

// 30 req/min - analytics endpoint protection.
export function getAnalyticsLimiter() {
  return createLimiter(30, '1 m', 'eccofood:analytics', true)
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  )
}

export async function applyRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ limited: boolean; headers: Record<string, string> }> {
  if (!limiter) {
    return { limited: false, headers: {} }
  }

  const result = await Promise.race([
    limiter.limit(identifier),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), RATE_LIMIT_TIMEOUT_MS)),
  ]).catch((error) => {
    console.warn('[rate-limit] skipped after error:', error instanceof Error ? error.message : error)
    return null
  })

  if (!result) {
    return { limited: false, headers: { 'X-RateLimit-Skipped': 'timeout' } }
  }

  const { success, limit, remaining, reset } = result

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  }

  if (!success) {
    headers['Retry-After'] = Math.ceil((reset - Date.now()) / 1000).toString()
  }

  return { limited: !success, headers }
}
