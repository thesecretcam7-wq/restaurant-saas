const READ_TIMEOUT_MS = 8_000
const RECOVERY_DELAY_MS = 15_000
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504, 520, 521, 522, 523, 524])

function unavailable() {
  // The SDK retries 503s. During cooldown those retries are answered locally,
  // with no backoff wait and, crucially, no additional database request.
  return Response.json({ code: 'DB_UNAVAILABLE', message: 'Base de datos temporalmente no disponible. Intenta de nuevo en unos segundos.', details: '', hint: '' }, {
    status: 503, headers: { 'Retry-After': '0', 'Cache-Control': 'no-store' },
  })
}

/** Bounds database reads only. Writes retain their original confirmation semantics. */
export function createDatabaseFetch(fetcher: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  const states = new Map<string, { blockedUntil: number; probing: boolean }>()
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (!url.pathname.startsWith('/rest/v1/') || !['GET', 'HEAD'].includes(method)) return fetcher(input, init)

    const callerSignal = init?.signal || (input instanceof Request ? input.signal : undefined)
    callerSignal?.throwIfAborted()
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return unavailable()
    const state = states.get(url.origin)
    if (state && (state.blockedUntil > Date.now() || state.probing)) return unavailable()
    if (state) state.probing = true
    const controller = new AbortController()
    const abort = () => controller.abort()
    callerSignal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, READ_TIMEOUT_MS)
    try {
      const response = await fetcher(input, { ...init, signal: controller.signal })
      if (TRANSIENT_STATUSES.has(response.status)) {
        void response.body?.cancel().catch(() => {})
        states.set(url.origin, { blockedUntil: Date.now() + RECOVERY_DELAY_MS, probing: false })
        return unavailable()
      }
      // The timeout also covers a response stalled after receiving its headers.
      const body = await response.arrayBuffer()
      if (state && states.get(url.origin) === state) states.delete(url.origin)
      return new Response(body.byteLength ? body : null, { status: response.status, statusText: response.statusText, headers: response.headers })
    } catch (error) {
      if (callerSignal?.aborted) {
        if (state) state.probing = false
        throw error
      }
      states.set(url.origin, { blockedUntil: Date.now() + RECOVERY_DELAY_MS, probing: false })
      return unavailable()
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', abort)
    }
  }
}
