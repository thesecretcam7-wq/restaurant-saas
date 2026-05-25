'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLAN_PRICES } from '@/lib/subscription-pricing'

interface ChangePlanModalProps {
  currentPlan: string
  newPlan: string
  domain: string
  tenantId: string
  onClose: () => void
}

const planPrices: Record<string, number> = PLAN_PRICES

const planNames: Record<string, string> = {
  trial: 'Período de Prueba',
  basic: 'Plan Básico',
  pro: 'Plan Pro',
  premium: 'Plan Premium',
}

export default function ChangePlanModal({
  currentPlan,
  newPlan,
  domain,
  tenantId,
  onClose,
}: ChangePlanModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPrice = planPrices[currentPlan] || 0
  const newPrice = planPrices[newPlan] || 0
  const priceDifference = newPrice - currentPrice

  // Calculate pro-rata (assuming 30-day cycle)
  const daysPerMonth = 30
  const dailyRate = newPrice / daysPerMonth
  const daysRemaining = daysPerMonth // For demo, assume full month remaining
  const proRataAmount = Math.round((dailyRate * daysRemaining) * 100) / 100

  const isUpgrade = newPrice > currentPrice
  const isDowngrade = newPrice < currentPrice

  const handleConfirm = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/customer/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          newPlan,
          currentPlan,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cambiar el plan')
      }

      // Success - redirect to subscription page
      router.push(`/${domain}/account/suscripcion?success=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirmar Cambio de Plan</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Current Plan */}
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600 mb-1">Plan Actual</p>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">{planNames[currentPlan]}</span>
              <span className="text-gray-600">${currentPrice.toFixed(2)}/mes</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-full p-2">→</div>
          </div>

          {/* New Plan */}
          <div className="border-b pb-4">
            <p className="text-sm text-gray-600 mb-1">Nuevo Plan</p>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">{planNames[newPlan]}</span>
              <span className="text-gray-600">${newPrice.toFixed(2)}/mes</span>
            </div>
          </div>

          {/* Pricing Info */}
          {currentPlan !== 'trial' && priceDifference !== 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Cálculo Pro-Rata</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Diferencia de precio:</span>
                  <span className={isUpgrade ? 'text-green-600' : 'text-orange-600'}>
                    {isUpgrade ? '+' : ''} ${Math.abs(priceDifference).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200">
                  <span className="font-semibold">Monto a {isUpgrade ? 'cobrar' : 'acreditar'}:</span>
                  <span className={`font-semibold ${isUpgrade ? 'text-green-600' : 'text-orange-600'}`}>
                    ${Math.abs(proRataAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentPlan === 'trial' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Tu período de prueba será reemplazado por</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">{planNames[newPlan]}</p>
              <p className="text-sm text-gray-600 mt-2">Precio: ${newPrice.toFixed(2)}/mes</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 ${
              isUpgrade ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Procesando...' : 'Confirmar Cambio'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          {isUpgrade
            ? 'Se te cobrará la diferencia de forma inmediata'
            : isDowngrade
            ? 'Recibirás un crédito para aplicar en tu próxima facturación'
            : 'El cambio será efectivo de inmediato'}
        </p>
      </div>
    </div>
  )
}
