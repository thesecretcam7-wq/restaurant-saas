'use client'

import { useEffect, useState } from 'react'
import { calculateTrialStatus, type TrialStatus } from '@/lib/trial'
import Link from 'next/link'

interface TrialBannerProps {
  trialEndsAt: string | null
  slug: string
}

export default function TrialBanner({ trialEndsAt, slug }: TrialBannerProps) {
  const [status, setStatus] = useState<TrialStatus | null>(null)

  useEffect(() => {
    setStatus(calculateTrialStatus(trialEndsAt))
    const interval = setInterval(() => {
      setStatus(calculateTrialStatus(trialEndsAt))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [trialEndsAt])

  if (!status) return null

  const getColor = () => {
    if (status.isExpired) return 'bg-red-50 border-red-200'
    if (status.daysRemaining <= 3) return 'bg-red-50 border-red-200'
    if (status.daysRemaining <= 7) return 'bg-orange-50 border-orange-200'
    return 'bg-blue-50 border-blue-200'
  }

  const getTextColor = () => {
    if (status.isExpired) return 'text-red-900'
    if (status.daysRemaining <= 3) return 'text-red-800'
    if (status.daysRemaining <= 7) return 'text-orange-800'
    return 'text-blue-800'
  }

  const getProgressColor = () => {
    if (status.isExpired) return 'bg-red-600'
    if (status.daysRemaining <= 3) return 'bg-red-600'
    if (status.daysRemaining <= 7) return 'bg-orange-500'
    return 'bg-blue-500'
  }

  if (status.isExpired) {
    return (
      <div className={`border rounded-lg p-4 mb-6 ${getColor()}`}>
        <div className={`${getTextColor()}`}>
          <h3 className="font-bold text-lg mb-2">¡Período de prueba expirado!</h3>
          <p className="text-sm mb-4">Tu cuenta de prueba ha expirado. Por favor, suscríbete a un plan para continuar usando Eccofood.</p>
          <Link
            href={`/${slug}/admin/planes`}
            className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Ver planes de suscripción
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-4 mb-6 ${getColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${getTextColor()}`}>
          <h3 className="font-bold text-lg">Prueba gratuita</h3>
          <p className="text-sm mt-1">
            {status.daysRemaining === 0
              ? `⏰ Menos de 1 día restante`
              : status.daysRemaining === 1
              ? `⏰ 1 día restante`
              : `⏰ ${status.daysRemaining} días restantes`}
          </p>
        </div>
        <Link
          href={`/${slug}/admin/planes`}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded font-semibold hover:bg-blue-700 transition-colors flex-shrink-0 ml-4"
        >
          Suscribirse
        </Link>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${status.percentageRemaining}%` }}
        />
      </div>

      {status.daysRemaining <= 7 && (
        <p className={`text-xs mt-2 ${getTextColor()}`}>
          ⚠️ Tu acceso será bloqueado cuando expire la prueba. Suscríbete ahora para evitar interrupciones.
        </p>
      )}
    </div>
  )
}
