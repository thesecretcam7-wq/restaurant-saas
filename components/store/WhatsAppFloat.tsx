'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle } from 'lucide-react'

interface WhatsAppFloatProps {
  whatsapp?: string | null
  restaurantName?: string | null
}

export function getWhatsAppHref(whatsapp?: string | null, restaurantName?: string | null) {
  if (!whatsapp) return null
  const trimmed = whatsapp.trim()
  if (!trimmed) return null

  const base = trimmed.startsWith('http')
    ? trimmed
    : `https://wa.me/${trimmed.replace(/\D/g, '')}`

  const separator = base.includes('?') ? '&' : '?'
  const text = encodeURIComponent('Hola necesito ayuda')
  return `${base}${separator}text=${text}`
}

export default function WhatsAppFloat({ whatsapp, restaurantName }: WhatsAppFloatProps) {
  const [mounted, setMounted] = useState(false)
  const href = getWhatsAppHref(whatsapp, restaurantName)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!href || !mounted) return null

  return createPortal(
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[7.25rem] right-4 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_18px_48px_rgba(37,211,102,0.38)] ring-1 ring-white/45 transition hover:scale-105 hover:bg-[#1ebe5d] active:scale-95 sm:bottom-[7.75rem] sm:right-6 sm:h-16 sm:w-16"
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <MessageCircle className="size-7 sm:size-8" />
    </a>,
    document.body
  )
}
