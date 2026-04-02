'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SubscriptionStatus {
  isTrialActive: boolean
  trialDaysLeft: number
  status: string
}

export default function SubscriptionBlockedPage({
  params,
}: {
  params: { domain: string }
}) {
  const router = useRouter()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    // Fetch subscription status
    fetch(`/api/subscription-status?domain=${params.domain}`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data)
        // Redirect if subscription is active
        if (data.hasActiveSubscription) {
          router.push(`/${params.domain}/admin/dashboard`)
        }
      })
      .catch((error) => console.error('Error fetching status:', error))
  }, [params.domain, router])

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {status.isTrialActive ? (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Período de Prueba Activo
                </h1>
                <p className="text-slate-600">
                  Disfruta de acceso completo por{' '}
                  <span className="font-bold text-blue-600">
                    {status.trialDaysLeft} días
                  </span>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-700">
                  Tu período de prueba gratuito está activo. Podrás acceder a todas
                  las funciones sin cargo durante este tiempo.
                </p>
              </div>

              <button
                onClick={() => router.push(`/${params.domain}/admin/dashboard`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Ir al Panel
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔒</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Suscripción Requerida
                </h1>
                <p className="text-slate-600">
                  Tu período de prueba ha finalizado
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-700">
                  Para continuar usando la plataforma, necesitas contratar un plan de
                  suscripción. Elige el plan que mejor se adapte a tu negocio.
                </p>
              </div>

              <button
                onClick={() => router.push(`/${params.domain}/admin/configuracion/planes`)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors mb-3"
              >
                Ver Planes de Suscripción
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Volver a Inicio
              </button>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              ¿Preguntas? Contacta a{' '}
              <a
                href="mailto:soporte@restaurantsaas.com"
                className="text-blue-600 hover:underline"
              >
                soporte@restaurantsaas.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
