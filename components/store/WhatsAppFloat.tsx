import { MessageCircle } from 'lucide-react'

interface WhatsAppFloatProps {
  whatsapp?: string | null
  restaurantName?: string | null
  primaryColor?: string | null
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

export default function WhatsAppFloat({ whatsapp, restaurantName, primaryColor }: WhatsAppFloatProps) {
  const href = getWhatsAppHref(whatsapp, restaurantName)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl shadow-black/25 transition hover:scale-105 active:scale-95 sm:bottom-28 sm:right-6 sm:h-16 sm:w-16"
      style={{ backgroundColor: primaryColor || '#25D366' }}
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <MessageCircle className="size-7 sm:size-8" />
    </a>
  )
}
