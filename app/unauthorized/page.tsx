'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="text-6xl mb-6">🔒</div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-red-900 mb-2">Acceso Denegado</h1>

        {/* Description */}
        <p className="text-red-700 mb-8">
          No tienes permiso para acceder a este restaurante. Si crees que es un error, verifica que estés usando la cuenta correcta.
        </p>

        {/* Error Code */}
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-8 text-left">
          <p className="text-sm text-red-600">
            <strong>Error:</strong> Acceso no autorizado (401)
          </p>
          <p className="text-xs text-red-500 mt-2">
            Este incidente ha sido registrado.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Volver Atrás
          </button>
          <Link href="/">
            <button className="bg-white hover:bg-gray-100 text-red-600 font-semibold py-2 px-6 rounded-lg border border-red-200 transition-colors w-full">
              Ir al Inicio
            </button>
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 pt-8 border-t border-red-200">
          <p className="text-sm text-red-700 mb-4">¿Necesitas ayuda?</p>
          <a
            href="mailto:soporte@restaurantsaas.com"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Contactar al Soporte
          </a>
        </div>
      </div>
    </div>
  )
}
