const PAYMENT_TIMEOUT_MS = 20_000
const SECURITY_TIMEOUT_MS = 8_000

export class POSPaymentConfirmationError extends Error {
  constructor() {
    super('No se recibió la confirmación del cobro. El carrito se conserva. Comprueba el ticket en el buscador antes de repetir el pago, porque podría haberse guardado.')
    this.name = 'POSPaymentConfirmationError'
  }
}

/** One attempt only: an interrupted write may already have reached the server. */
export async function fetchPOSPayment(
  url: string,
  init: RequestInit,
  fetcher: typeof fetch = (...args) => fetch(...args),
) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (init.signal?.aborted) abort()
  init.signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, PAYMENT_TIMEOUT_MS)
  try {
    const response = await fetcher(url, { ...init, signal: controller.signal })
    // Keep the deadline active while reading the body, too. Otherwise a stalled
    // response after its headers can leave the payment button locked forever.
    const body = await response.arrayBuffer()
    return new Response(body.byteLength ? body : null, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    })
  } catch {
    throw new POSPaymentConfirmationError()
  } finally {
    clearTimeout(timeout)
    init.signal?.removeEventListener('abort', abort)
  }
}

export async function fetchPOSSecurityToken(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SECURITY_TIMEOUT_MS)
  try {
    const response = await fetcher('/api/csrf-token', {
      credentials: 'include', cache: 'no-store', signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok || typeof data?.token !== 'string' || !data.token) throw new Error('Invalid security response')
    return data.token as string
  } catch {
    throw new Error('No se pudo preparar la seguridad del pago. No se envió el cobro; espera a recuperar la conexión e inténtalo de nuevo.')
  } finally {
    clearTimeout(timeout)
  }
}
