'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAccessRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return

    setIsLoading(true)
    // Redirect to restaurant page
    router.push(`/${slug}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            🍽️ Restaurant SaaS
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            La plataforma todo-en-uno para restaurantes. Gestiona tu menú, órdenes,
            reservas y más desde un solo lugar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Left Column - Access Existing */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Accede a tu Restaurante
            </h2>
            <p className="text-slate-600 mb-6">
              Si ya tienes un restaurante registrado, ingresa tu slug para acceder.
            </p>

            <form onSubmit={handleAccessRestaurant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tu Slug (nombre único)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="ej: mi-pizzeria"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Solo letras, números y guiones. Ej: pizza-juan, burger-king-123
                </p>
              </div>

              <button
                type="submit"
                disabled={!slug.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? 'Cargando...' : 'Acceder'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                <strong>Ejemplo:</strong> Si tu restaurante tiene slug "pizza-juan",
                accederás como:
              </p>
              <code className="block bg-slate-100 p-3 rounded mt-2 text-sm text-slate-700 overflow-x-auto">
                restaurant-saas-inky.vercel.app/pizza-juan
              </code>
            </div>
          </div>

          {/* Right Column - Register New */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Nuevo Restaurante
            </h2>
            <p className="text-slate-600 mb-6">
              ¿No tienes cuenta? Registra tu restaurante ahora y obtén 14 días
              de acceso gratuito.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-slate-900">14 días gratis</p>
                  <p className="text-sm text-slate-600">Sin tarjeta de crédito</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">🎨</span>
                <div>
                  <p className="font-semibold text-slate-900">Personaliza tu tienda</p>
                  <p className="text-sm text-slate-600">Colores, logo y dominio</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="font-semibold text-slate-900">Gestiona todo</p>
                  <p className="text-sm text-slate-600">Menú, órdenes, reservas</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-semibold text-slate-900">Recibe pagos</p>
                  <p className="text-sm text-slate-600">Stripe integrado</p>
                </div>
              </div>
            </div>

            <Link
              href="/register"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-center"
            >
              Registrar Restaurante
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Características Principales
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold mb-2">Gestión de Menú</h3>
              <p className="text-blue-100">
                Crea categorías, agrupa productos, maneja variantes y controla disponibilidad
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">Tienda Online</h3>
              <p className="text-blue-100">
                Tu propia tienda online con carrito, checkout y seguimiento de órdenes
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">Reservas</h3>
              <p className="text-blue-100">
                Sistema de reservas con calendario, mesas y gestión de disponibilidad
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-semibold mb-2">Delivery</h3>
              <p className="text-blue-100">
                Habilita entregas a domicilio con tarifa configurable y tiempo estimado
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Pagos Seguros</h3>
              <p className="text-blue-100">
                Stripe integrado para recibir pagos directos sin comisiones
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-lg p-6 text-white">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">Tu Marca</h3>
              <p className="text-blue-100">
                Personaliza colores, logo, fuentes y dominio. ¡Hazlo tuyo!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-blue-100">
          <p className="mb-4">
            ¿Preguntas? Contacta a{' '}
            <a href="mailto:soporte@restaurantsaas.com" className="underline hover:text-white">
              soporte@restaurantsaas.com
            </a>
          </p>
          <p className="text-sm">
            © 2024 Restaurant SaaS. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
