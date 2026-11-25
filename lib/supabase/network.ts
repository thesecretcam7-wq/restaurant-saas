import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createDatabaseFetch } from './database-network'

const AUTH_TIMEOUT_MS = 8_000
const AUTH_COOLDOWN_MS = 60_000

export class AuthConnectionError extends Error {
  constructor() {
    super('No se pudo verificar la sesion. Comprueba la conexion e intenta de nuevo.')
    this.name = 'AuthConnectionError'
  }
}

export function isAuthConnectionError(error: unknown): boolean {
  if (error instanceof AuthConnectionError) return true
  if (!error || typeof error !== 'object') return false
  const authError = error as { name?: string; status?: number }
  return authError.name === 'AuthRetryableFetchError'
    || authError.status === 0
    || authError.status === 429
    || (typeof authError.status === 'number' && authError.status >= 500)
}

function unavailable() {
  // A retryable response preserves the SDK's stored session and refresh token.
  return Response.json({ message: 'Servicio de sesion temporalmente no disponible' }, {
    status: 503,
    headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
  })
}

export function createSupabaseFetch(fetcher: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  const blockedUntil = new Map<string, number>()
  const databaseFetch = createDatabaseFetch(fetcher)

  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const isSessionRequest = url.pathname === '/auth/v1/user'
      || (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token')
    const isPasswordRequest = url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password'
    if (!isSessionRequest && !isPasswordRequest) return databaseFetch(input, init)

    const callerSignal = init?.signal || (input instanceof Request ? input.signal : undefined)
    callerSignal?.throwIfAborted()

    if ((typeof navigator !== 'undefined' && navigator.onLine === false)
      || (isSessionRequest && (blockedUntil.get(url.origin) || 0) > Date.now())) return unavailable()

    const controller = new AbortController()
    const abort = () => controller.abort()
    if (callerSignal?.aborted) abort()
    else callerSignal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, AUTH_TIMEOUT_MS)

    try {
      const response = await fetcher(input, { ...init, signal: controller.signal })
      if (response.status === 429 || response.status >= 500) {
        void response.body?.cancel().catch(() => {})
        if (isSessionRequest) blockedUntil.set(url.origin, Date.now() + AUTH_COOLDOWN_MS)
        return unavailable()
      }
      // Keep the deadline until the payload is received, not just its headers.
      const body = await response.arrayBuffer()
      return new Response(body.byteLength ? body : null, { status: response.status, statusText: response.statusText, headers: response.headers })
    } catch (error) {
      if (callerSignal?.aborted) throw error
      // Explicit password attempts stay independent from background refresh cooldowns.
      if (isSessionRequest) blockedUntil.set(url.origin, Date.now() + AUTH_COOLDOWN_MS)
      return unavailable()
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', abort)
    }
  }
}

export const supabaseFetch = createSupabaseFetch()

export async function getVerifiedUser(client: SupabaseClient): Promise<User | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      client.auth.getUser(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AuthConnectionError()), 10_000)
      }),
    ])
    if (isAuthConnectionError(result.error)) throw new AuthConnectionError()
    if (result.error) return null
    return result.data.user
  } finally {
    clearTimeout(timeout)
  }
}
