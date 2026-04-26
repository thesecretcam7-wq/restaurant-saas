'use client'

import { useCartStore } from '@/lib/store/cart'

interface Props {
  item: { id: string; name: string; price: number; image_url?: string }
  tenantId: string
  color?: string
  small?: boolean
}

export default function AddToCartButton({ item, tenantId, color = '#4F46E5', small }: Props) {
  const { addItem, removeItem, items } = useCartStore()
  const qty = items.find(i => i.item_id === item.id)?.qty || 0

  const add = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ item_id: item.id, name: item.name, price: item.price, image_url: item.image_url, qty: 1 }, tenantId)
  }

  const remove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    removeItem(item.id)
  }

  if (qty === 0) {
    return (
      <button
        onClick={add}
        className={`rounded-full text-white flex items-center justify-center font-bold shadow-md active:scale-90 transition-transform flex-shrink-0 ${small ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'}`}
        style={{ backgroundColor: color }}
      >
        +
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 rounded-full px-1.5 shadow-md flex-shrink-0 ${small ? 'h-8' : 'h-10'}`} style={{ backgroundColor: color }}>
      <button
        onClick={remove}
        className={`text-white font-bold flex items-center justify-center active:scale-90 transition-transform ${small ? 'w-6 h-6 text-sm' : 'w-7 h-7 text-base'}`}
      >
        −
      </button>
      <span className={`text-white font-extrabold min-w-[16px] text-center ${small ? 'text-xs' : 'text-sm'}`}>{qty}</span>
      <button
        onClick={add}
        className={`text-white font-bold flex items-center justify-center active:scale-90 transition-transform ${small ? 'w-6 h-6 text-sm' : 'w-7 h-7 text-base'}`}
      >
        +
      </button>
    </div>
  )
}
