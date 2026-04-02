'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'

const SECTIONS = [
  { href: 'branding',    label: 'Branding', desc: 'Logo, colores, tipografía', icon: '🎨' },
  { href: 'restaurante', label: 'Restaurante', desc: 'Nombre, contacto, ubicación', icon: '🏪' },
  { href: 'delivery',    label: 'Delivery y Pagos', desc: 'Tarifas, métodos de pago, IVA', icon: '🚗' },
  { href: 'reservas',    label: 'Reservas', desc: 'Mesas, capacidad, anticipación', icon: '📅' },
  { href: 'planes',      label: 'Plan y Suscripción', desc: 'Gestiona tu plan actual', icon: '💳' },
]

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantId = params.domain as string
  const pathname = usePathname()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Personaliza y administra tu restaurante</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <aside className="lg:col-span-1">
          <nav className="bg-white rounded-xl border overflow-hidden">
            {SECTIONS.map(s => {
              const href = `/${tenantId}/admin/configuracion/${s.href}`
              const isActive = pathname?.endsWith(`/configuracion/${s.href}`)
              return (
                <Link
                  key={s.href}
                  href={href}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mt-0.5">{s.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>{s.label}</p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="lg:col-span-3">
          {children}
        </main>
      </div>
    </div>
  )
}
