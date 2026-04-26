'use client'

import { ReactNode, useEffect, useState } from 'react'
import { calculateTrialStatus } from '@/lib/trial'
import Link from 'next/link'

interface TrialExpiredGuardProps {
  trialEndsAt: string | null
  slug: string
  hasActiveSubscription?: boolean
  subscriptionPlan?: string | null
  subscriptionExpiresAt?: string | null
  children: ReactNode
}

export default function TrialExpiredGuard({
  trialEndsAt,
  slug,
  hasActiveSubscription,
  subscriptionPlan,
  subscriptionExpiresAt,
  children
}: TrialExpiredGuardProps) {
  const [isExpired, setIsExpired] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const checkIfBlocked = () => {
      const trialStatus = calculateTrialStatus(trialEndsAt)
      const hasPaidPlan = subscriptionPlan && subscriptionPlan !== 'free'

      // Check if subscription is still active (not expired)
      let isSubscriptionValid = false
      if (subscriptionExpiresAt) {
        const now = new Date()
        const expiresDate = new Date(subscriptionExpiresAt)
        isSubscriptionValid = expiresDate > now
      }

      // Block if:
      // - Trial expired AND
      // - No valid subscription AND
      // - Not a paid plan
      const shouldBlock = trialStatus.isExpired && !isSubscriptionValid && !hasPaidPlan
      setIsExpired(shouldBlock)
    }

    checkIfBlocked()

    // Check periodically (every minute)
    const interval = setInterval(checkIfBlocked, 60000)
    return () => clearInterval(interval)
  }, [trialEndsAt, hasActiveSubscription, subscriptionPlan, subscriptionExpiresAt])

  if (!mounted) return <>{children}</>

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M9 3h6a9 9 0 019 9v6a9 9 0 01-9 9H9a9 9 0 01-9-9V9a9 9 0 019-9z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Período de prueba expirado</h1>
          <p className="text-gray-600 mb-6">
            Tu acceso a Eccofood ha sido bloqueado. Por favor, suscríbete a uno de nuestros planes para continuar usando la plataforma.
          </p>

          <div className="space-y-3">
            <Link
              href={`/${slug}/admin/planes`}
              className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Ver planes de suscripción
            </Link>
            <a
              href="mailto:support@eccofood.com"
              className="block w-full py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Contactar soporte
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
