'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SubscriptionStatus {
  hasActiveSubscription: boolean
  status: string
  plan: string | null
  isTrialActive: boolean
  trialDaysLeft: number
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const domain = params.domain as string
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!domain) return

    const checkAccess = async () => {
      try {
        // 1. PRIMERO: Verificar que el usuario es propietario del restaurante
        console.log(`[AdminLayout] Verifying ownership for domain: ${domain}`)

        const ownerResponse = await fetch(`/api/verify-tenant-owner?slug=${domain}`)

        if (!ownerResponse.ok) {
          console.error('[AdminLayout] Ownership check failed:', ownerResponse.status)
          router.push('/unauthorized')
          return
        }

        const ownerData = await ownerResponse.json()

        if (!ownerData.isOwner) {
          console.error(`[AdminLayout] ❌ User is not owner of ${domain}`)
          router.push('/unauthorized')
          return
        }

        console.log(`[AdminLayout] ✅ Ownership verified for ${domain}`)

        // 2. SEGUNDO: Verificar suscripción
        const response = await fetch(`/api/subscription-status?domain=${domain}`)
        if (!response.ok) throw new Error('Failed to fetch subscription status')

        const data = await response.json()
        setSubscriptionStatus(data)

        // Block access if no active subscription and not in trial
        if (!data.hasActiveSubscription) {
          console.warn(`[AdminLayout] ⚠️ No active subscription for ${domain}`)
          router.push(`/${domain}/(admin)/subscription-blocked`)
          return
        }

        console.log(`[AdminLayout] ✅ All checks passed for ${domain}`)
      } catch (err) {
        console.error('[AdminLayout] Error during checks:', err)
        setError(err instanceof Error ? err.message : 'Error checking access')
        // Redirect on error to be safe
        router.push('/unauthorized')
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [domain, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Verificando suscripción...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => router.push(`/${domain}/(admin)/subscription-blocked`)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // Show trial warning banner if in trial
  return (
    <>
      {subscriptionStatus?.isTrialActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Período de Prueba:</span> {subscriptionStatus.trialDaysLeft}{' '}
              días restantes. Contrata un plan pronto para continuar accediendo.
            </p>
            <button
              onClick={() => router.push(`/${domain}/admin/configuracion/planes`)}
              className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded transition-colors"
            >
              Ver Planes
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
