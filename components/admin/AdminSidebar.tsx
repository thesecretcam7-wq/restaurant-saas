'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Brain,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Eye,
  Activity,
  KeyRound,
  LayoutDashboard,
  Menu,
  Monitor,
  Package,
  PanelsTopLeft,
  QrCode,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Table2,
  UsersRound,
  X,
} from 'lucide-react'
import { detectAdminSection, getSectionColorVar } from '@/lib/colors'
import { StoreStatusToggle } from './StoreStatusToggle'
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher'

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
  tenantId?: string
  storeEnabled?: boolean
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
  storePage: Store,
  password: KeyRound,
  kds: ChefHat,
  comandero: ClipboardList,
  staffAccess: UsersRound,
  personal: UsersRound,
  qr: QrCode,
  audit: ShieldCheck,
  ai: Brain,
  health: Activity,
}

const navTranslationByIcon: Record<string, string> = {
  dashboard: 'admin.nav.dashboard',
  orders: 'admin.nav.orders',
  kds: 'admin.nav.kds',
  screen: 'admin.nav.screen',
  staffAccess: 'admin.nav.staffAccess',
  kiosk: 'admin.nav.kiosk',
  products: 'admin.nav.products',
  banners: 'admin.nav.banners',
  reservations: 'admin.nav.reservations',
  customers: 'admin.nav.customers',
  sales: 'admin.nav.sales',
  cash: 'admin.nav.cash',
  settings: 'admin.nav.settings',
  pos: 'admin.nav.pos',
  inventory: 'admin.nav.inventory',
  tables: 'admin.nav.tables',
  qr: 'admin.nav.qr',
  ai: 'admin.nav.ai',
  audit: 'admin.nav.audit',
}

function getRestaurantStoreUrl(tenantSlug: string) {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
  return `https://${tenantSlug}.${baseDomain}/`
}

export function AdminSidebar({
  tenantSlug,
  restaurantName,
  logoUrl,
  primaryColor,
  navLinks,
  userTenants,
  isOwner,
  tenantId,
  storeEnabled = true,
}: AdminSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const storeUrl = getRestaurantStoreUrl(tenantSlug)
  const { tr } = useI18n()

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <span className="flex h-14 w-20 flex-shrink-0 items-center justify-center">
                <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
              </span>
            ) : (
              <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-[#15130f]">
                {restaurantName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white" style={{ color: primaryColor ?? undefined }}>
                {restaurantName}
              </p>
              <p className="text-xs font-semibold text-white/45">{tr('admin.subtitle')}</p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setOpen(false)}
            aria-label={tr('admin.closeMenu')}
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {isOwner && userTenants.length > 1 && (
          <div className="mb-4 border-b border-white/10 pb-4">
            <p className="px-3 pb-2 text-[11px] font-black uppercase text-white/35">{tr('admin.myRestaurants')}</p>
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
          const translatedLabel = navTranslationByIcon[link.icon] ? tr(navTranslationByIcon[link.icon]) : link.label

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
                <span className="truncate">{translatedLabel}</span>
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <LanguageSwitcher className="mb-2 w-full justify-between border-white/10 bg-white/10 text-white [&_select]:text-white" compact={false} />
        {tenantId && <StoreStatusToggle tenantId={tenantId} initialEnabled={storeEnabled} />}
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-white/64 transition hover:bg-white/8 hover:text-white"
        >
          <Eye className="size-4" />
          <span>{tr('admin.viewStore')}</span>
        </a>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-white/64 transition hover:bg-white/8 hover:text-white"
          >
            <DoorOpen className="size-4" />
            <span>{tr('admin.logout')}</span>
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
        aria-label={tr('admin.openMenu')}
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
