import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv()
  }
  return redis
}

// 500 req/min — protección general contra DDoS (Next.js genera ~10 RSC prefetch por página)
export function getGlobalLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(500, '1 m'),
    prefix: 'eccofood:global',
  })
}

// 5 req/min — prevención de fuerza bruta en login/registro
export function getAuthLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'eccofood:auth',
  })
}

// 10 req/min — protección de costo en endpoints de IA
export function getAiLimiter() {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'eccofood:ai',
  })
}

// 20 req/min — prevención de spam en pedidos
export function getOrdersLimiter() {
  return new Ratelimit({
    redis: getRedis(),
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
  limiter: Ratelimit,
  identifier: string
): Promise<{ limited: boolean; headers: Record<string, string> }> {
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
