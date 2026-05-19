'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import { formatPriceWithCurrency } from '@/lib/currency'
import Link from 'next/link'

export default function CartBar({
  tenantId,
  primaryColor,
  currencyInfo,
  basePath,
  themeMode,
}: {
  tenantId: string
  primaryColor?: string
  currencyInfo?: { code: string; locale: string }
  basePath?: string
  themeMode?: 'light' | 'dark' | string
}) {
  const [mounted, setMounted] = useState(false)
  const { items, total } = useCartStore()
  const count = mounted ? items.reduce((s, i) => s + i.qty, 0) : 0
  const color = primaryColor || '#4F46E5'
  const isDark = themeMode === 'dark'
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo?.code || 'EUR', currencyInfo?.locale || 'es-ES')
  const pathBase = basePath ?? `/${tenantId}`

  useEffect(() => {
    setMounted(true)
  }, [])

  if (count === 0) return null

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-0 right-0 z-40 px-4">
      <Link
        href={`${pathBase}/carrito`}
        className="flex items-center justify-between w-full max-w-lg mx-auto px-4 py-3.5 rounded-2xl shadow-xl active:scale-95 transition-transform"
        style={{
          backgroundColor: isDark ? 'rgba(8, 8, 8, 0.92)' : color,
          border: isDark ? `1px solid ${color}66` : undefined,
          color: isDark ? '#fffaf0' : '#ffffff',
          boxShadow: isDark ? '0 20px 54px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.07)' : undefined,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center" style={{ backgroundColor: isDark ? color : 'rgba(255,255,255,.25)', color: isDark ? '#15130f' : '#ffffff' }}>{count}</span>
          <span className="font-semibold text-sm">Ver pedido</span>
        </span>
        <span className="font-extrabold text-sm" style={{ color: isDark ? color : undefined }}>{money(total())}</span>
      </Link>
    </div>
  )
}
