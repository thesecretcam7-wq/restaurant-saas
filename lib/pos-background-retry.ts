/** A failed background upload must not be retried by every new local sale. */
export function createPOSBackgroundRetry(now = Date.now) {
  let failures = 0
  let retryAt = 0
  let inFlight = false

  return {
    begin(force = false) {
      if (inFlight || (!force && now() < retryAt)) return false
      inFlight = true
      return true
    },
    complete(success: boolean) {
      inFlight = false
      if (success) {
        failures = 0
        retryAt = 0
      } else {
        failures = Math.min(failures + 1, 4)
        retryAt = now() + Math.min(15_000 * 2 ** (failures - 1), 120_000)
      }
    },
  }
}
