'use client'

import { useParams, usePathname } from 'next/navigation'

const CONFIG_SECTIONS = [
  { href: 'personalizacion', label: '🎨 Personalización' },
  { href: 'restaurante', label: '🏪 Restaurante' },
  { href: 'delivery', label: '🚗 Delivery y Pagos' },
  { href: 'reservas', label: '📅 Reservas' },
  { href: 'integraciones', label: '🔗 Integraciones' },
  { href: 'planes', label: '💳 Planes' },
]

export default function ConfigurationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const tenantSlug = params.domain as string
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Configuración</h1>
          <p className="text-gray-600 text-sm mt-1">Administra tu restaurante y personalización</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1">
            <nav className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {CONFIG_SECTIONS.map(section => {
                const isActive = pathname?.includes(`/configuracion/${section.href}`)
                return (
                  <a
                    key={section.href}
                    href={`/${tenantSlug}/admin/configuracion/${section.href}`}
                    className={`block px-4 py-3 border-b last:border-b-0 transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-l-4 border-l-blue-600 text-blue-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {section.label}
                  </a>
                )
              })}
            </nav>
          </aside>

          <main className="md:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
