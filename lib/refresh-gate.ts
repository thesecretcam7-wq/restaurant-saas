export function createRefreshGate(initialUpdatedAt = 0, now = Date.now) {
  let updatedAt = initialUpdatedAt
  let inFlight = false
  let retryAfter = 0

  return {
    begin({ online, visible, editing = false, force = false }: {
      online: boolean
      visible: boolean
      editing?: boolean
      force?: boolean
    }) {
      if (inFlight || !online || !visible || (!force && editing)) return false
      if (!force && (now() < retryAfter || now() - updatedAt < 30_000)) return false
      inFlight = true
      return true
    },
    complete(success: boolean, timestamp = now()) {
      inFlight = false
      if (success) {
        updatedAt = timestamp
        retryAfter = 0
      } else {
        retryAfter = now() + 60_000
      }
    },
  }
}
