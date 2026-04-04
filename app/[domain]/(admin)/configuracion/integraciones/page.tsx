'use client'

import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface StripeAccount {
  id: string
  status: 'verified' | 'pending' | 'failed' | null
  charges_enabled?: boolean
  payouts_enabled?: boolean
}

export default function IntegracionesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const domain = params.domain as string

  const [tenantData, setTenantData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [stripeStatus, setStripeStatus] = useState<StripeAccount | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(searchParams?.get('connected') === 'true')

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        const res = await fetch(`/api/tenant/branding?domain=${domain}`)
        const data = await res.json()
        setTenantData(data)

        if (data.stripe_account_id) {
          setStripeStatus({
            id: data.stripe_account_id,
            status: data.stripe_account_status,
          })
        }
      } catch (err) {
        console.error('Error fetching tenant:', err)
        setError('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }

    if (domain) fetchTenantData()
  }, [domain])

  const handleConnectStripe = async () => {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al conectar')
      }

      // Redirigir a Stripe para completar onboarding
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Integraciones</h2>
        <p className="text-slate-600">Conecta herramientas y servicios a tu restaurante</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">
            ✓ Cuenta Stripe conectada correctamente. Ahora puedes recibir pagos.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">✕ {error}</p>
        </div>
      )}

      {/* Stripe Integration Card */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="grid md:grid-cols-3 gap-6 p-6">
          {/* Logo and Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-4 mb-4">
              {/* Stripe Logo */}
              <div className="w-12 h-12 bg-[#0066FF] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Stripe</h3>
                <p className="text-xs text-slate-500">Pagos en línea</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-1">
            {stripeStatus?.status === 'verified' ? (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <span className="font-semibold text-green-900">Conectado</span>
                </div>
                <p className="text-sm text-green-800">
                  Cuenta ID: <code className="text-xs bg-white px-2 py-1 rounded">{stripeStatus.id}</code>
                </p>
              </div>
            ) : stripeStatus?.status === 'pending' ? (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></span>
                  <span className="font-semibold text-yellow-900">Pendiente</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Verifica tu cuenta en Stripe
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  <span className="font-semibold text-slate-900">Desconectado</span>
                </div>
                <p className="text-sm text-slate-600">
                  No configurado aún
                </p>
              </div>
            )}
          </div>

          {/* Description and Action */}
          <div className="md:col-span-1 flex flex-col justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-4">
                Recibe pagos directamente en tu cuenta bancaria. Stripe maneja toda la seguridad de transacciones.
              </p>
            </div>
            {stripeStatus?.status === 'verified' ? (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="w-full px-4 py-2 bg-slate-200 text-slate-600 rounded-lg font-medium cursor-not-allowed"
              >
                Conectado
              </button>
            ) : (
              <button
                onClick={handleConnectStripe}
                disabled={connecting}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {connecting ? 'Conectando...' : 'Conectar'}
              </button>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {stripeStatus?.status === 'verified' && (
          <div className="border-t border-slate-200 bg-slate-50 p-4">
            <details className="cursor-pointer">
              <summary className="font-medium text-slate-900 hover:text-slate-700">
                ✓ Requisitos completados
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 ml-4">
                <li>✓ Identidad verificada</li>
                <li>✓ Información bancaria confirmada</li>
                <li>✓ Términos aceptados</li>
                <li>✓ Pagos y transferencias habilitados</li>
              </ul>
            </details>
          </div>
        )}

        {stripeStatus?.status === 'pending' && (
          <div className="border-t border-yellow-200 bg-yellow-50 p-4">
            <details className="cursor-pointer">
              <summary className="font-medium text-yellow-900 hover:text-yellow-800">
                ⚠ Acciones pendientes
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-yellow-800 ml-4">
                <li>• Verifica tu identidad</li>
                <li>• Agrega tu información bancaria</li>
                <li>• Acepta los términos de Stripe</li>
                <li>• Espera a la aprobación final</li>
              </ul>
              <button
                onClick={handleConnectStripe}
                className="mt-3 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded font-medium transition-colors"
              >
                Continuar
              </button>
            </details>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h4 className="font-semibold text-blue-900 mb-2">¿Necesitas ayuda?</h4>
        <p className="text-blue-800 text-sm mb-3">
          La conexión con Stripe es obligatoria para recibir pagos. Si tienes problemas:
        </p>
        <ul className="space-y-2 text-sm text-blue-800 ml-4">
          <li>1. Verifica que uses la cuenta de email correcta</li>
          <li>2. Completa todos los pasos de verificación</li>
          <li>3. Ten a mano un documento de identidad válido</li>
          <li>4. Proporciona información bancaria correcta</li>
        </ul>
      </div>

      {/* Back to Configuration */}
      <div>
        <Link
          href={`/${domain}/admin/configuracion`}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          ← Volver a Configuración
        </Link>
      </div>
    </div>
  )
}
