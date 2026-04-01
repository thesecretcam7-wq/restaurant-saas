'use client'

import { useCartStore } from '@/lib/store/cart'

interface Props {
  item: { id: string; name: string; price: number; image_url?: string }
  tenantId: string
  color?: string
}

export default function AddToCartButton({ item, tenantId, color = '#3B82F6' }: Props) {
  const { addItem, items } = useCartStore()
  const qty = items.find(i => i.item_id === item.id)?.qty || 0

  const add = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem({ item_id: item.id, name: item.name, price: item.price, image_url: item.image_url, qty: 1 }, tenantId)
  }

  return (
    <button
      onClick={add}
      className="relative w-10 h-10 rounded-full text-white flex items-center justify-center text-xl flex-shrink-0 hover:opacity-90 transition-opacity"
      style={{ backgroundColor: color }}
    >
      +
      {qty > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
          {qty}
        </span>
      )}
    </button>
  )
}
