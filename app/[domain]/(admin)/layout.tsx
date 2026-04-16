'use client'

/**
 * ADMIN LAYOUT - ECCOFOOD BRAND ENFORCEMENT
 *
 * Admin interfaces ALWAYS use Eccofood professional branding.
 * Tenant custom colors are NOT applied to admin panels.
 * This maintains professional consistency and prevents brand dilution.
 *
 * CSS Note: Admin pages use --admin-primary, --admin-secondary, --admin-accent
 * which are hardcoded to Eccofood colors and cannot be overridden by tenants.
 */

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-700 font-medium">Verificando suscripción...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center space-y-4 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <p className="text-red-600 font-semibold mb-4">Error: {error}</p>
          <button
            onClick={() => router.push(`/${domain}/(admin)/subscription-blocked`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
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
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 px-4 py-4 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-orange-900 font-semibold">
              ⏰ Período de Prueba: <span className="font-black text-orange-700">{subscriptionStatus.trialDaysLeft} días</span> restantes. Contrata un plan para continuar.
            </p>
            <button
              onClick={() => router.push(`/${domain}/admin/configuracion/planes`)}
              className="text-sm bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-semibold transition-colors shadow-sm"
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
