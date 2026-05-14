'use client'

import { Menu } from 'lucide-react'

export function AdminMobileMenuTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('eccofood:open-admin-menu'))}
      className="fixed left-4 top-[calc(env(safe-area-inset-top)+0.85rem)] z-[10000] inline-flex h-12 items-center gap-2 rounded-2xl border border-[#f2cf82]/45 bg-gradient-to-br from-[#f2cf82] via-[#d9a441] to-[#b85c1f] px-4 text-sm font-black text-[#080704] shadow-[0_18px_60px_rgba(217,164,65,0.35)] active:scale-95 md:hidden"
      aria-label="Abrir menu del panel"
    >
      <Menu className="size-5" />
      Menu
    </button>
  )
}
