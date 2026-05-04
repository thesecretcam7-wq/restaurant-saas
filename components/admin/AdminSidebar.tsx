'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Eye,
  KeyRound,
  LayoutDashboard,
  Menu,
  Monitor,
  Package,
  PanelsTopLeft,
  ReceiptText,
  Settings,
  ShoppingBag,
  Store,
  Table2,
  UsersRound,
  X,
} from 'lucide-react'
import { detectAdminSection, getSectionColorVar } from '@/lib/colors'

interface NavLink {
  href: string
  label: string
  icon: string
  divider?: boolean
}

interface AdminSidebarProps {
  tenantSlug: string
  restaurantName: string
  logoUrl?: string | null
  primaryColor?: string | null
  navLinks: NavLink[]
  userTenants: { id: string; slug: string; organization_name: string }[]
  isOwner: boolean
  staffName?: string | null
}

const icons: Record<string, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  screen: Monitor,
  kiosk: PanelsTopLeft,
  products: ChefHat,
  banners: ReceiptText,
  reservations: CalendarDays,
  customers: UsersRound,
  sales: BarChart3,
  cash: CreditCard,
  settings: Settings,
  pos: CreditCard,
  inventory: Package,
  tables: Table2,
  password: KeyRound,
  kds: ChefHat,
  comandero: ClipboardList,
  staffAccess: UsersRound,
}

export function AdminSidebar({
  tenantSlug,
  restaurantName,
  logoUrl,
  primaryColor,
  navLinks,
  userTenants,
  isOwner,
}: AdminSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-10 flex-shrink-0 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-[#15130f]">
                {restaurantName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white" style={{ color: primaryColor ?? undefined }}>
                {restaurantName}
              </p>
              <p className="text-xs font-semibold text-white/45">Panel operativo</p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {isOwner && userTenants.length > 1 && (
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="px-3 pb-2 text-[11px] font-black uppercase text-white/35">Mis restaurantes</p>
            <div className="space-y-1">
              {userTenants.map(t => (
                <Link
                  key={t.id}
                  href={`/${t.slug}/admin/dashboard`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    t.slug === tenantSlug
                      ? 'bg-white text-[#15130f]'
                      : 'text-white/62 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Store className="size-4 flex-shrink-0" />
                  <span className="truncate">{t.organization_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {navLinks.map(link => {
          const isActive = pathname.includes(link.href.split('/').pop() || '')
          const linkSection = detectAdminSection(link.href)
          const linkColor = `var(${getSectionColorVar(linkSection)})`
          const Icon = icons[link.icon] || LayoutDashboard

          return (
            <div key={link.href}>
              {link.divider && <div className="my-3 border-t border-white/10" />}
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  isActive
                    ? 'bg-white text-[#15130f] shadow-sm'
                    : 'text-white/64 hover:bg-white/8 hover:text-white'
                }`}
                style={isActive ? { boxShadow: `inset 3px 0 0 ${linkColor}` } : undefined}
              >
                <Icon className="size-4 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href={`/${tenantSlug}/menu`}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/64 transition hover:bg-white/8 hover:text-white"
        >
          <Eye className="size-4" />
          <span>Ver tienda</span>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-white/64 transition hover:bg-white/8 hover:text-white"
          >
            <DoorOpen className="size-4" />
            <span>Cerrar sesion</span>
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-black/10 bg-[#15130f] shadow-2xl shadow-black/10">
        {sidebarContent}
      </aside>

      <button
        className="fixed left-3 top-3 z-40 rounded-lg border border-black/10 bg-white p-2 text-[#15130f] shadow-sm md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/35 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#15130f] shadow-2xl transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
