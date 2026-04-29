import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600 text-lg">Gestiona todas las cuentas de clientes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cuentas Card */}
          <Link href="/admin/cuentas" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestionar Cuentas</h2>
              <p className="text-gray-600 mb-4">Ve todas las cuentas de clientes, busca, filtra y desbloquea cuentas expiradas</p>
              <div className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                Ir al panel
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Dashboard de Ingresos Card */}
          <Link href="/admin/ingresos" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard de Ingresos</h2>
              <p className="text-gray-600 mb-4">Visualiza ingresos totales, suscripciones activas, tasa de churn y tendencias de ingresos</p>
              <div className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                Ir al panel
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">ℹ️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Información</h2>
            <p className="text-gray-600 mb-4">
              Este es el panel de administración de Eccofood. Aquí puedes gestionar todas las cuentas de tus clientes.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ Ver todas las cuentas creadas</li>
              <li>✓ Filtrar por estado (prueba, activo, suspendido)</li>
              <li>✓ Desbloquear cuentas expiradas</li>
              <li>✓ Ver ingresos y suscripciones</li>
            </ul>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Sistema de Prueba</h3>
          <p className="text-gray-700 mb-4">
            Todos los clientes nuevos reciben 30 días de prueba gratuita. Cuando la prueba expira, tienen dos opciones:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">1. Extender Prueba</p>
              <p className="text-sm text-gray-600">Agrega más días al período de prueba (ej: 30 días adicionales)</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">2. Activar Suscripción</p>
              <p className="text-sm text-gray-600">Marca como pagado cuando reciben un pago manual</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
