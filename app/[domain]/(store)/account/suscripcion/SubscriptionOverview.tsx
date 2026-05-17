'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getTrialEndsAt } from '@/lib/trial'
import { PLAN_PRICES } from '@/lib/subscription-pricing'

interface Tenant {
  id: string
  subscription_plan: string | null
  subscription_expires_at: string | null
  trial_ends_at: string | null
  created_at?: string | null
  status: string
}

const planDetails: Record<string, { name: string; price: number; description: string; features: string[] }> = {
  basic: {
    name: 'Plan Basico',
    price: PLAN_PRICES.basic,
    description: 'Carta QR, TPV, comandero y KDS para operar caja, sala y cocina',
    features: ['Carta QR incluida', 'TPV / POS completo', 'Comandero para meseros', 'KDS cocina incluido', 'Hasta 1.000 pedidos/mes'],
  },
  pro: {
    name: 'Plan Pro',
    price: PLAN_PRICES.pro,
    description: 'Operacion completa con pagina web y kiosko',
    features: ['Todo en Basico', 'Pagina web del restaurante', 'Kiosko autoservicio', 'Reservas y delivery', 'Analytics avanzado'],
  },
  premium: {
    name: 'Plan Premium',
    price: PLAN_PRICES.premium,
    description: 'Todas las funciones con disenos exclusivos por cliente',
    features: ['Todo en Pro', 'Disenos exclusivos para cada cliente', 'Dominio personalizado', 'Multiples sucursales', 'Integraciones personalizadas', 'Soporte 24/7 dedicado'],
  },
}

export default function SubscriptionOverview({ tenant }: { tenant: Tenant }) {
  const params = useParams() as { domain: string }
  const domain = params.domain

  const currentPlan = tenant.subscription_plan ? planDetails[tenant.subscription_plan] : null
  const now = new Date()

  let statusInfo: { label: string; color: string; description: string } | null = null

  if (tenant.status === 'trial') {
    const trialEndsAt = getTrialEndsAt(tenant.trial_ends_at, tenant.created_at)
    if (trialEndsAt) {
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      if (daysRemaining > 0) {
        statusInfo = {
          label: 'Período de Prueba Activo',
          color: 'blue',
          description: `Tu período de prueba vence en ${daysRemaining} días (${trialEndsAt.toLocaleDateString('es-CO')})`,
        }
      } else {
        statusInfo = {
          label: 'Período de Prueba Expirado',
          color: 'red',
          description: 'Tu período de prueba ha expirado. Por favor, activa un plan de pago.',
        }
      }
    }
  } else if (tenant.status === 'active' && tenant.subscription_expires_at) {
    const expiresAt = new Date(tenant.subscription_expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    if (daysRemaining > 0) {
      statusInfo = {
        label: 'Suscripción Activa',
        color: 'green',
        description: `Se renueva el ${expiresAt.toLocaleDateString('es-CO')}`,
      }
    } else {
      statusInfo = {
        label: 'Suscripción Expirada',
        color: 'red',
        description: 'Tu suscripción ha expirado. Por favor, renuévala.',
      }
    }
  } else if (tenant.status === 'suspended') {
    statusInfo = {
      label: 'Cuenta Suspendida',
      color: 'orange',
      description: 'Tu cuenta está suspendida. Contacta al soporte.',
    }
  }

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  }

  const badgeColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      {statusInfo && (
        <div className={`border rounded-xl p-6 ${colorClasses[statusInfo.color]}`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold mb-2">{statusInfo.label}</h2>
              <p className="text-sm">{statusInfo.description}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${badgeColors[statusInfo.color]}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-white rounded-xl shadow p-8 border-l-4 border-blue-500">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentPlan.name}</h2>
              <p className="text-gray-600">{currentPlan.description}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">EUR {currentPlan.price}</div>
              <div className="text-sm text-gray-600">por mes</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900">Incluye:</h3>
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center text-gray-700">
                <span className="mr-3">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {tenant.subscription_expires_at && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Próxima renovación:</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(tenant.subscription_expires_at).toLocaleDateString('es-CO')}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href={`/${domain}/account/cambiar-plan`}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center"
            >
              Cambiar Plan
            </Link>
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold">
              Cancelar Suscripción
            </button>
          </div>
        </div>
      )}

      {/* Trial or No Plan Message */}
      {!currentPlan && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sin Plan Activo</h2>
          <p className="text-gray-600 mb-6">
            {tenant.status === 'trial'
              ? 'Estás en período de prueba. Elige un plan para continuar con acceso ilimitado.'
              : 'No tienes un plan activo. Por favor, activa uno para continuar.'}
          </p>
          <Link
            href={`/${domain}/account/cambiar-plan`}
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Elegir Plan
          </Link>
        </div>
      )}

      {/* Billing History Link */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Historial de Facturación</h3>
            <p className="text-sm text-gray-600 mt-1">Ver tus invoices y pagos anteriores</p>
          </div>
          <Link
            href={`/${domain}/account/facturas`}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Ver Facturas
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Preguntas Frecuentes</h3>
        <div className="space-y-4">
          <details className="border-b pb-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">¿Cómo cambio mi plan?</summary>
            <p className="mt-2 text-gray-600 text-sm">
              Puedes cambiar tu plan en cualquier momento. Ve a "Cambiar Plan" y elige el plan que deseas. Los cambios se aplicarán inmediatamente.
            </p>
          </details>
          <details className="border-b pb-4">
            <summary className="font-semibold text-gray-900 cursor-pointer">¿Puedo cancelar en cualquier momento?</summary>
            <p className="mt-2 text-gray-600 text-sm">
              Sí, puedes cancelar tu suscripción en cualquier momento. Tu acceso continuará hasta el final del período de facturación actual.
            </p>
          </details>
          <details>
            <summary className="font-semibold text-gray-900 cursor-pointer">¿Qué sucede después del período de prueba?</summary>
            <p className="mt-2 text-gray-600 text-sm">
              Después del período de prueba gratuito, deberás elegir un plan de pago para continuar usando el servicio. Sin plan activo, tu cuenta será suspendida.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
