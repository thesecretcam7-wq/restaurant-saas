'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

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

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl && (
            <img src={logoUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: primaryColor ?? undefined }}>
              {restaurantName}
            </p>
            <p className="text-xs text-gray-500">Panel Admin</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden ml-2 p-1 rounded text-gray-500 hover:bg-gray-100"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isOwner && userTenants.length > 1 && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-xs font-semibold text-gray-500 px-3 mb-2">MIS RESTAURANTES</p>
            <div className="space-y-1">
              {userTenants.map(t => (
                <Link
                  key={t.id}
                  href={`/${t.slug}/admin/dashboard`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    t.slug === tenantSlug
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{t.organization_name.includes('Demo') ? '🎮' : '🏪'}</span>
                  <span className="truncate">{t.organization_name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {navLinks.map(link => (
          <div key={link.href}>
            {link.divider && <div className="my-2 border-t" />}
            <Link
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1">
        <Link
          href={`/${tenantSlug}/menu`}
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          target="_blank"
        >
          <span>👁️</span>
          <span>Ver tienda</span>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 text-left"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* ── Mobile: hamburger button ── */}
      <button
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-white border rounded-lg shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* ── Mobile: overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile: slide-in sidebar ── */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
