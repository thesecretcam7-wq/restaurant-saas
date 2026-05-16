'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCartStore } from '@/lib/store/cart'
import { formatPriceWithCurrency } from '@/lib/currency'

interface Topping {
  id: string
  name: string
  price: number
}

interface Props {
  item: { id: string; name: string; price: number; image_url?: string | null }
  toppings: Topping[]
  tenantId: string
  primaryColor: string
  currencyInfo?: { code: string; locale: string }
  freeToppingsLabel?: string
  onClose: () => void
}

export default function ToppingsModal({
  item,
  toppings,
  tenantId,
  primaryColor,
  currencyInfo,
  freeToppingsLabel = 'Ingredientes gratis',
  onClose,
}: Props) {
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([])
  const [qty, setQty] = useState(1)
  const [mounted, setMounted] = useState(false)
  const { addItem } = useCartStore()

  const toppingsCost = selectedToppings.reduce((sum, topping) => sum + topping.price, 0)
  const itemTotal = (item.price + toppingsCost) * qty
  const money = (value: number) =>
    formatPriceWithCurrency(Number(value || 0), currencyInfo?.code || 'EUR', currencyInfo?.locale || 'es-ES')
  const hasOnlyFreeToppings = toppings.length > 0 && toppings.every(topping => Number(topping.price || 0) === 0)

  useEffect(() => {
    setMounted(true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings(current =>
      current.find(selected => selected.id === topping.id)
        ? current.filter(selected => selected.id !== topping.id)
        : [...current, topping]
    )
  }

  const handleAddToCart = () => {
    addItem(
      {
        item_id: item.id,
        name: item.name,
        price: item.price,
        image_url: item.image_url || undefined,
        qty,
        toppings: selectedToppings,
      },
      tenantId
    )
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end bg-black/72 backdrop-blur-md" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar adicionales" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[#d9a441]/22 bg-[#11100d] pb-[calc(1rem+env(safe-area-inset-bottom))] text-[#fff4d8] shadow-[0_-24px_90px_rgba(0,0,0,0.56)]">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#d9a441]/18 bg-[#15130f] p-4">
          <h2 className="text-lg font-black text-[#fff4d8]">{item.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full border border-[#d9a441]/18 bg-white/5 text-2xl font-light text-[#fff4d8]/70 transition hover:bg-white/10 hover:text-[#fff4d8]"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-[radial-gradient(circle_at_16%_0%,rgba(217,164,65,0.12),transparent_16rem)] p-4">
          <div className="flex gap-4">
            {item.image_url && (
              <div className="flex-shrink-0">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="size-20 rounded-2xl border border-[#d9a441]/16 bg-white/5 object-contain p-1"
                />
              </div>
            )}
            <div className="flex-1">
              <p className="font-black text-[#fff4d8]">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-[#b9a989]">Precio base</p>
              <p className="text-lg font-black" style={{ color: primaryColor }}>
                {money(item.price)}
              </p>
            </div>
          </div>

          {toppings.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-[#fff4d8]">
                  {hasOnlyFreeToppings ? freeToppingsLabel : 'Agregar adicionales'}
                </h3>
                {hasOnlyFreeToppings && (
                  <p className="mt-1 text-sm font-semibold text-[#b9a989]">
                    Elige lo que quieres que lleve. No tiene costo adicional.
                  </p>
                )}
              </div>

              {toppings.map(topping => {
                const selected = selectedToppings.some(current => current.id === topping.id)
                return (
                  <label
                    key={topping.id}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d9a441]/16 bg-white/[0.045] p-3 transition hover:border-[#d9a441]/34 hover:bg-white/[0.075]"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTopping(topping)}
                      className="size-5 rounded border-[#d9a441]/30 bg-black/20"
                      style={{ accentColor: primaryColor }}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-[#fff4d8]">{topping.name}</p>
                      {topping.price > 0 && (
                        <p className="text-xs font-semibold text-[#b9a989]">+{money(topping.price)}</p>
                      )}
                      {topping.price <= 0 && hasOnlyFreeToppings && (
                        <p className="text-xs font-semibold text-[#b9a989]">Gratis</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 space-y-3 border-t border-[#d9a441]/18 bg-[#15130f] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#b9a989]">Cantidad</span>
            <div className="flex items-center gap-2 rounded-xl border border-[#d9a441]/14 bg-white/7 p-1">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex size-9 items-center justify-center rounded-lg font-black text-[#fff4d8] transition-colors hover:bg-white/10"
              >
                −
              </button>
              <span className="w-8 text-center font-black text-[#fff4d8]">{qty}</span>
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="flex size-9 items-center justify-center rounded-lg font-black text-[#fff4d8] transition-colors hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#d9a441]/14 pt-2">
            <span className="font-black text-[#fff4d8]">Total</span>
            <p className="text-xl font-black" style={{ color: primaryColor }}>
              {money(itemTotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full rounded-2xl py-3 text-center font-black text-[#0a0805] shadow-[0_16px_38px_rgba(217,164,65,0.22)] transition-transform active:scale-95"
            style={{ backgroundColor: primaryColor }}
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
