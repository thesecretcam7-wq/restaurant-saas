'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface DashboardStats {
  totalOrders?: number
  totalRevenue?: number
  totalReservations?: number
  totalCustomers?: number
}

export default function DashboardPage() {
  const params = useParams()
  const domain = params.domain as string
  const [stats, setStats] = useState<DashboardStats>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Placeholder: cargar estadísticas si es necesario
    setIsLoading(false)
  }, [])

  const menuItems = [
    {
      title: 'Productos',
      icon: '🍔',
      href: `/${domain}/admin/productos`,
      description: 'Gestionar menú y productos',
    },
    {
      title: 'Pedidos',
      icon: '📦',
      href: `/${domain}/admin/pedidos`,
      description: 'Ver y gestionar órdenes',
    },
    {
      title: 'Reservas',
      icon: '📅',
      href: `/${domain}/admin/reservas`,
      description: 'Gestionar reservaciones',
    },
    {
      title: 'Clientes',
      icon: '👥',
      href: `/${domain}/admin/clientes`,
      description: 'Base de datos de clientes',
    },
    {
      title: 'Ventas',
      icon: '📊',
      href: `/${domain}/admin/ventas`,
      description: 'Reportes y analytics',
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      href: `/${domain}/admin/configuracion`,
      description: 'Branding, dominio, planes',
    },
  ]

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
