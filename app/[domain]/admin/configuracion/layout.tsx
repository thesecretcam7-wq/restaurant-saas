'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Globe2,
  LayoutTemplate,
  Paintbrush,
  Palette,
  Printer,
  Settings,
  Store,
  Truck,
  UsersRound,
} from 'lucide-react'

const sections = [
  { href: 'personalizacion', label: 'Marca y tienda', desc: 'Logo, colores, diseno, textos y redes', Icon: Paintbrush, hidden: true },
  { href: 'pagina', label: 'Editor de secciones', desc: 'Orden y portada de la tienda', Icon: LayoutTemplate, hidden: true },
  { href: 'branding', label: 'Branding', desc: 'Ruta anterior de compatibilidad', Icon: Palette, hidden: true },
  { href: 'restaurante', label: 'Restaurante', desc: 'Nombre, ubicacion y datos publicos', Icon: Store },
  { href: 'personal', label: 'Personal', desc: 'Empleados, roles y PINs', Icon: UsersRound },
  { href: 'horarios', label: 'Horarios', desc: 'Dias y horas de atencion', Icon: Clock3 },
  { href: 'delivery', label: 'Delivery y pagos', desc: 'Tarifas, metodos, impuestos', Icon: Truck },
  { href: 'reservas', label: 'Reservas', desc: 'Mesas, capacidad y anticipacion', Icon: CalendarDays },
  { href: 'impresoras', label: 'Impresoras', desc: 'Tickets y dispositivos USB', Icon: Printer },
  { href: 'stripe', label: 'Stripe', desc: 'Cuenta de cobro e integracion', Icon: CreditCard },
  { href: 'dominio', label: 'Dominio', desc: 'Dominio propio y URLs', Icon: Globe2 },
  { href: 'planes', label: 'Plan', desc: 'Suscripcion y limites', Icon: Settings },
]

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantId = params.domain as string
  const pathname = usePathname()
  const router = useRouter()

  const activeSection = sections.find(s => pathname?.endsWith(`/configuracion/${s.href}`))
  const isInSection = !!activeSection

  const navList = (
    <nav className="admin-panel overflow-hidden p-2">
      {sections.filter(section => !section.hidden).map(({ href, label, desc, Icon }) => {
        const fullHref = `/${tenantId}/admin/configuracion/${href}`
        const active = activeSection?.href === href
        return (
          <Link
            key={href}
            href={fullHref}
            className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
              active ? 'bg-[#15130f] text-white shadow-sm' : 'text-black/62 hover:bg-white hover:text-[#15130f]'
            }`}
          >
            <span className={`flex size-10 flex-shrink-0 items-center justify-center rounded-lg ${active ? 'bg-white/12 text-white' : 'bg-black/5 text-[#e43d30]'}`}>
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black">{label}</span>
              <span className={`block truncate text-xs font-semibold ${active ? 'text-white/54' : 'text-black/42'}`}>{desc}</span>
            </span>
            <ChevronRight className={`size-4 flex-shrink-0 ${active ? 'text-white/50' : 'text-black/25 group-hover:text-[#e43d30]'}`} />
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header hidden lg:flex">
        <div>
          <p className="admin-eyebrow">Sistema</p>
          <h1 className="admin-title">Configuracion</h1>
          <p className="admin-subtitle">Gestiona la operacion, pagos, personal y presencia digital del restaurante.</p>
        </div>
      </div>

      {isInSection ? (
        <div className="sticky top-0 z-10 mb-4 flex h-14 items-center gap-3 border-b border-black/10 bg-[#f5f3ee]/92 px-1 backdrop-blur lg:hidden">
          <button onClick={() => router.back()} className="rounded-lg p-2 text-black/55 transition hover:bg-white hover:text-black" aria-label="Volver">
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <h1 className="text-lg font-black text-[#15130f]">{activeSection.label}</h1>
        </div>
      ) : (
        <div className="mb-4 lg:hidden">
          <p className="admin-eyebrow">Sistema</p>
          <h1 className="admin-title">Configuracion</h1>
        </div>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <aside className={isInSection ? 'hidden min-w-0 lg:block' : 'block min-w-0'}>
          {navList}
        </aside>
        <main className={isInSection ? 'block min-w-0' : 'hidden min-w-0 lg:block'}>
          {children}
        </main>
      </div>
    </div>
  )
}
