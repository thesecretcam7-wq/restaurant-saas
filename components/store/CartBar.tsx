'use client'

import { useCartStore } from '@/lib/store/cart'
import { formatPrice } from '@/lib/currency'
import Link from 'next/link'

export default function CartBar({ tenantId, primaryColor }: { tenantId: string; primaryColor?: string }) {
  const { items, total } = useCartStore()
  const count = items.reduce((s, i) => s + i.qty, 0)
  const color = primaryColor || '#3B82F6'

  if (count === 0) return null

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-4 pb-2">
      <Link
        href={`/${tenantId}/carrito`}
        className="flex items-center justify-between w-full max-w-lg mx-auto px-4 py-3.5 rounded-2xl text-white shadow-xl active:scale-95 transition-transform"
        style={{ backgroundColor: color }}
      >
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 bg-white/25 rounded-full text-xs font-extrabold flex items-center justify-center">{count}</span>
          <span className="font-semibold text-sm">Ver pedido</span>
        </span>
        <span className="font-extrabold text-sm">{formatPrice(total())}</span>
      </Link>
    </div>
  )
}
