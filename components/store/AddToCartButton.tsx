'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/lib/store/cart'
import ToppingsModal from './ToppingsModal'

interface Topping {
  id: string
  name: string
  price: number
}

interface Props {
  item: { id: string; name: string; price: number; image_url?: string | null }
  tenantId: string
  color?: string
  small?: boolean
  toppings?: Topping[]
  currencyInfo?: { code: string; locale: string }
  freeToppingsLabel?: string
}

export default function AddToCartButton({ item, tenantId, color = '#4F46E5', small, toppings = [], currencyInfo, freeToppingsLabel }: Props) {
  const [mounted, setMounted] = useState(false)
  const [showToppingsModal, setShowToppingsModal] = useState(false)
  const { addItem, removeItem, items } = useCartStore()
  const qty = mounted ? items.filter(i => i.item_id === item.id).reduce((sum, i) => sum + i.qty, 0) : 0

  useEffect(() => {
    setMounted(true)
  }, [])

  const add = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (toppings.length > 0) {
      setShowToppingsModal(true)
    } else {
      addItem({ item_id: item.id, name: item.name, price: item.price, image_url: item.image_url || undefined, qty: 1 }, tenantId)
    }
  }

  const remove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const cartItems = items.filter(i => i.item_id === item.id)
    if (cartItems.length > 0) {
      removeItem(cartItems[0].item_id)
    }
  }

  if (qty === 0) {
    return (
      <>
        <button
          onClick={add}
          className={`rounded-full text-white flex items-center justify-center font-bold shadow-md active:scale-90 transition-transform flex-shrink-0 ${small ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'}`}
          style={{ backgroundColor: color }}
        >
          +
        </button>
        {showToppingsModal && (
          <ToppingsModal
            item={item}
            toppings={toppings}
            tenantId={tenantId}
            primaryColor={color}
            currencyInfo={currencyInfo}
            freeToppingsLabel={freeToppingsLabel}
            onClose={() => setShowToppingsModal(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
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
      {showToppingsModal && (
        <ToppingsModal
          item={item}
          toppings={toppings}
          tenantId={tenantId}
          primaryColor={color}
          currencyInfo={currencyInfo}
          freeToppingsLabel={freeToppingsLabel}
          onClose={() => setShowToppingsModal(false)}
        />
      )}
    </>
  )
}
