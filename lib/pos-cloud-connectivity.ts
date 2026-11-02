const PROBE_TIMEOUT_MS = 8_000
const SUCCESS_CACHE_MS = 5_000

export function createPOSCloudProbe(
  fetcher: typeof fetch = (...args) => fetch(...args),
  online = () => typeof navigator === 'undefined' || navigator.onLine,
) {
  const pending = new Map<string, Promise<boolean>>()
  const successes = new Map<string, number>()
  const failures = new Map<string, { attempts: number; retryAt: number }>()

  return function check(tenantId: string, options: { force?: boolean } = {}): Promise<boolean> {
    if (!tenantId || !online()) return Promise.resolve(false)
    if ((successes.get(tenantId) || 0) > Date.now()) return Promise.resolve(true)
    const existing = pending.get(tenantId)
    if (existing) return existing
    const failure = failures.get(tenantId)
    if (!options.force && failure && Date.now() < failure.retryAt) return Promise.resolve(false)

    const failed = () => {
      const attempts = Math.min((failure?.attempts || 0) + 1, 3)
      failures.set(tenantId, { attempts, retryAt: Date.now() + 15_000 * 2 ** (attempts - 1) })
      successes.delete(tenantId)
      return false
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const request = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(`/api/pos/cloud-health?tenantId=${encodeURIComponent(tenantId)}`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) return failed()
        const body = await response.json()
        if (body?.ok !== true) return failed()
        failures.delete(tenantId)
        successes.set(tenantId, Date.now() + SUCCESS_CACHE_MS)
        return true
      } catch {
        return failed()
      } finally {
        clearTimeout(timeout)
        pending.delete(tenantId)
      }
    })
    pending.set(tenantId, request)
    return request
  }
}

export const canReachPOSCloud = createPOSCloudProbe()

export async function fetchPOSBootstrapWithTimeout(
  tenantId: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  try {
    return await fetcher(`/api/pos/bootstrap?tenantId=${encodeURIComponent(tenantId)}`, {
      credentials: 'include', cache: 'no-store', signal: controller.signal,
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
