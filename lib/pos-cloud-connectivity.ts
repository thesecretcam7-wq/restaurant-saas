const PROBE_TIMEOUT_MS = 8_000
const SUCCESS_CACHE_MS = 5_000

export function createPOSCloudProbe(
  fetcher: typeof fetch = (...args) => fetch(...args),
  online = () => typeof navigator === 'undefined' || navigator.onLine,
) {
  const pending = new Map<string, Promise<boolean>>()
  const successes = new Map<string, number>()

  return function check(tenantId: string): Promise<boolean> {
    if (!tenantId || !online()) return Promise.resolve(false)
    if ((successes.get(tenantId) || 0) > Date.now()) return Promise.resolve(true)
    const existing = pending.get(tenantId)
    if (existing) return existing

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const request = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(`/api/pos/cloud-health?tenantId=${encodeURIComponent(tenantId)}`, {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        })
        if (!response.ok) return false
        const body = await response.json()
        if (body?.ok !== true) return false
        successes.set(tenantId, Date.now() + SUCCESS_CACHE_MS)
        return true
      } catch {
        return false
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
