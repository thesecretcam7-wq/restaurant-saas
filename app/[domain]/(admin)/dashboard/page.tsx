'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { canUseFeature, SubscriptionPlan } from '@/lib/feature-gates'

interface DashboardStats {
  totalOrders?: number
  totalRevenue?: number
  totalReservations?: number
  totalCustomers?: number
}

interface SubscriptionStatus {
  plan: SubscriptionPlan
}

export default function DashboardPage() {
  const params = useParams()
  const domain = params.domain as string
  const [stats, setStats] = useState<DashboardStats>({})
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    // Cargar stats y plan de suscripción
    const loadData = async () => {
      try {
        const response = await fetch(`/api/subscription-status?domain=${domain}`)
        const subData = await response.json()
        setSubscription(subData)
      } catch (err) {
        console.error('Error loading subscription:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [domain])

  const allMenuItems = [
    {
      title: 'Productos',
      icon: '🍔',
      href: `/${domain}/admin/productos`,
      description: 'Gestionar menú y productos',
      feature: 'items' as const,
      requiredPlan: 'free',
    },
    {
      title: 'Pedidos',
      icon: '📦',
      href: `/${domain}/admin/pedidos`,
      description: 'Ver y gestionar órdenes',
      feature: 'orders' as const,
      requiredPlan: 'free',
    },
    {
      title: 'Delivery',
      icon: '🚚',
      href: `/${domain}/admin/configuracion/delivery`,
      description: 'Configurar entregas a domicilio',
      feature: 'delivery' as const,
      requiredPlan: 'basic',
    },
    {
      title: 'Reservas',
      icon: '📅',
      href: `/${domain}/admin/reservas`,
      description: 'Gestionar reservaciones',
      feature: 'reservations' as const,
      requiredPlan: 'pro',
    },
    {
      title: 'Staff',
      icon: '👨‍💼',
      href: `/${domain}/admin/configuracion/mesero`,
      description: 'Sistema de Mesero/Cocina',
      feature: 'staff_management' as const,
      requiredPlan: 'pro',
    },
    {
      title: 'Clientes',
      icon: '👥',
      href: `/${domain}/admin/clientes`,
      description: 'Base de datos de clientes',
      feature: 'orders' as const,
      requiredPlan: 'free',
    },
    {
      title: 'Analytics',
      icon: '📊',
      href: `/${domain}/admin/ventas`,
      description: 'Reportes y estadísticas avanzadas',
      feature: 'analytics' as const,
      requiredPlan: 'premium',
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      href: `/${domain}/admin/configuracion`,
      description: 'Branding, dominio, planes',
      feature: 'items' as const,
      requiredPlan: 'free',
    },
  ]

  // Filtrar items según plan
  const plan = subscription?.plan || 'free'
  const menuItems = allMenuItems.filter(item => canUseFeature(plan, item.feature))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Panel de Control
          </h1>
          <p className="text-slate-600 mt-1">
            Bienvenido a tu dashboard. Administra tu restaurante desde aquí.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Órdenes Totales</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              {stats.totalOrders || '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Ingresos</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              ${stats.totalRevenue || '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Reservas</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              {stats.totalReservations || '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-slate-600">Clientes</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              {stats.totalCustomers || '—'}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <h2 className="text-xl font-bold text-slate-900 mb-6">Funciones Principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer h-full">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Bloqueadas por plan */}
        {allMenuItems.length > menuItems.length && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Funciones Premium</h2>
              <Link href={`/${domain}/admin/configuracion/planes`}>
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors text-sm font-medium">
                  Mejorar Plan
                </button>
              </Link>
            </div>
            <p className="text-slate-600 mb-6">
              Estas funciones están disponibles en planes superiores. Mejora tu plan para acceder.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allMenuItems
                .filter(item => !canUseFeature(plan, item.feature))
                .map((item) => (
                  <div
                    key={item.href}
                    className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 h-full relative opacity-75"
                  >
                    <div className="absolute top-3 right-3 bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-1 rounded">
                      {item.requiredPlan.toUpperCase()}
                    </div>
                    <div className="text-4xl mb-4 opacity-50">{item.icon}</div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 text-sm">{item.description}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">¿Necesitas ayuda?</h3>
          <p className="text-blue-800 mb-4">
            Consulta nuestra documentación o contacta al soporte técnico.
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:soporte@restaurantsaas.com"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
              Contactar Soporte
            </a>
            <a
              href={`/${domain}/admin/configuracion/planes`}
              className="inline-block bg-white hover:bg-slate-100 text-blue-600 px-4 py-2 rounded border border-blue-200 transition-colors"
            >
              Ver Planes
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
