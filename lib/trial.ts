export interface TrialStatus {
  isExpired: boolean
  daysRemaining: number
  hoursRemaining: number
  minutesRemaining: number
  percentageRemaining: number
  expiresAt: Date
}

export function calculateTrialStatus(trialEndsAt: string | Date | null): TrialStatus {
  if (!trialEndsAt) {
    return {
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      percentageRemaining: 0,
      expiresAt: new Date(),
    }
  }

  const expiresAt = new Date(trialEndsAt)
  const now = new Date()
  const totalMillis = expiresAt.getTime() - now.getTime()
  const isExpired = totalMillis <= 0

  const daysRemaining = Math.ceil(totalMillis / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.ceil((totalMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutesRemaining = Math.ceil((totalMillis % (1000 * 60 * 60)) / (1000 * 60))

  // Calculate percentage (30 days = 100%, 0 days = 0%)
  const totalDays = 30
  const percentageRemaining = Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100))

  return {
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    hoursRemaining: Math.max(0, hoursRemaining),
    minutesRemaining: Math.max(0, minutesRemaining),
    percentageRemaining,
    expiresAt,
  }
}
