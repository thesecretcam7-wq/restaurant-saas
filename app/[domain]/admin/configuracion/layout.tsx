'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const SECTIONS = [
  { href: 'personalizacion', label: 'Personalización', desc: 'Logo, colores, marca, página, contacto', icon: '🎨' },
  { href: 'restaurante', label: 'Restaurante', desc: 'Nombre, contacto, ubicación', icon: '🏪' },
  { href: 'personal',    label: 'Personal', desc: 'Gestiona empleados y PINs', icon: '👥' },
  { href: 'horarios',    label: 'Horarios', desc: 'Días y horas de atención', icon: '🕐' },
  { href: 'delivery',    label: 'Delivery y Pagos', desc: 'Tarifas, métodos de pago, IVA', icon: '🚗' },
  { href: 'reservas',    label: 'Reservas', desc: 'Mesas, capacidad, anticipación', icon: '📅' },
  { href: 'impresoras',  label: 'Impresoras', desc: 'Configurar impresoras USB', icon: '🖨️' },
  { href: 'stripe',      label: 'Stripe / Pagos', desc: 'Conecta tu cuenta Stripe', icon: '💳' },
  { href: 'dominio',     label: 'Dominio', desc: 'Conecta tu dominio propio', icon: '🌐' },
  { href: 'planes',      label: 'Plan y Suscripción', desc: 'Gestiona tu plan actual', icon: '⭐' },
]

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantId = params.domain as string
  const pathname = usePathname()
  const router = useRouter()

  const activeSection = SECTIONS.find(s => pathname?.endsWith(`/configuracion/${s.href}`))
  const isInSection = !!activeSection

  const navList = (
    <nav className="bg-white rounded-xl border overflow-hidden">
      {SECTIONS.map(s => {
        const href = `/${tenantId}/admin/configuracion/${s.href}`
        const isActive = s === activeSection
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
            <span className="ml-auto text-gray-300 self-center lg:hidden">›</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden lg:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Personaliza y administra tu restaurante</p>
      </div>

      {/* Mobile header — back button when inside a section */}
      {isInSection ? (
        <div className="lg:hidden sticky top-0 z-10 bg-white border-b h-14 flex items-center gap-3 px-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="font-bold text-gray-900 text-lg">{activeSection.label}</h1>
        </div>
      ) : (
        <div className="lg:hidden mb-4 px-0">
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-1">Personaliza y administra tu restaurante</p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-4 lg:gap-6">
        {/* Sidebar nav — always visible on desktop, only on root on mobile */}
        <aside className={`lg:col-span-1 ${isInSection ? 'hidden lg:block' : 'block'}`}>
          {navList}
        </aside>

        {/* Content — always visible on desktop, only when in section on mobile */}
        <main className={`lg:col-span-3 ${isInSection ? 'block' : 'hidden lg:block'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
