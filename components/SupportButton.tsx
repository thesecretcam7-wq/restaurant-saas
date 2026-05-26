'use client'

import Link from 'next/link'
import { MessageCircleQuestion } from 'lucide-react'

export default function SupportButton() {
  return (
    <Link
      href="/soporte"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#111827] px-4 py-3 text-sm font-black text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all hover:-translate-y-1 hover:bg-[#1f2937] hover:shadow-[0_12px_40px_rgba(0,0,0,0.30)] active:scale-95"
      aria-label="Contactar soporte"
    >
      <MessageCircleQuestion className="size-5 shrink-0" />
      <span>¿Necesitas ayuda?</span>
    </Link>
  )
}
