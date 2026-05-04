import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

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

// 500 req/min - general DDoS protection.
export function getGlobalLimiter() {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(500, '1 m'),
    prefix: 'eccofood:global',
  })
}

// 5 req/min - login/register brute-force protection.
export function getAuthLimiter() {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'eccofood:auth',
  })
}

// 10 req/min - cost protection on AI endpoints.
export function getAiLimiter() {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'eccofood:ai',
  })
}

// 20 req/min - order spam protection.
export function getOrdersLimiter() {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'eccofood:orders',
  })
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

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

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
