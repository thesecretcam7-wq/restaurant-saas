'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu } from 'lucide-react'

interface AdminMobileMenuTriggerProps {
  onOpen?: () => void
}

export function AdminMobileMenuTrigger({ onOpen }: AdminMobileMenuTriggerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <button
      type="button"
      onClick={() => {
        if (onOpen) {
          onOpen()
          return
        }
        window.dispatchEvent(new Event('eccofood:open-admin-menu'))
      }}
      className="ecco-admin-mobile-menu-trigger md:hidden"
      aria-label="Abrir menu del panel"
    >
      <Menu className="size-5" />
      Menu
    </button>,
    document.body
  )
}
