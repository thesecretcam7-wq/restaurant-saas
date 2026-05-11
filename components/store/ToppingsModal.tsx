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

export default function ToppingsModal({ item, toppings, tenantId, primaryColor, currencyInfo, freeToppingsLabel = 'Ingredientes gratis', onClose }: Props) {
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([])
  const [qty, setQty] = useState(1)
  const [mounted, setMounted] = useState(false)
  const { addItem } = useCartStore()

  const toppingsCost = selectedToppings.reduce((sum, t) => sum + t.price, 0)
  const itemTotal = (item.price + toppingsCost) * qty
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo?.code || 'EUR', currencyInfo?.locale || 'es-ES')
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
    setSelectedToppings(prev =>
      prev.find(t => t.id === topping.id)
        ? prev.filter(t => t.id !== topping.id)
        : [...prev, topping]
    )
  }

  const handleAddToCart = () => {
    addItem({
      item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url || undefined,
      qty,
      toppings: selectedToppings,
    }, tenantId)
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Cerrar adicionales" onClick={onClose} />
      <div className="relative z-10 w-full bg-white rounded-t-2xl max-h-[90vh] flex flex-col pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-lg text-gray-900">{item.name}</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 font-light"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Item Image & Price */}
          <div className="flex gap-4">
            {item.image_url && (
              <div className="flex-shrink-0">
                <img src={item.image_url} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-600 mt-1">Precio base</p>
              <p className="text-lg font-bold" style={{ color: primaryColor }}>
                {money(item.price)}
              </p>
            </div>
          </div>

          {/* Toppings List */}
          {toppings.length > 0 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                  {hasOnlyFreeToppings ? freeToppingsLabel : 'Agregar adicionales'}
                </h3>
                {hasOnlyFreeToppings && (
                  <p className="mt-1 text-sm text-gray-500">Elige lo que quieres que lleve. No tiene costo adicional.</p>
                )}
              </div>
              {toppings.map(topping => (
                <label
                  key={topping.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedToppings.some(t => t.id === topping.id)}
                    onChange={() => toggleTopping(topping)}
                    className="w-5 h-5 rounded accent-color"
                    style={{ accentColor: primaryColor }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{topping.name}</p>
                    {topping.price > 0 && (
                      <p className="text-xs text-gray-500">+{money(topping.price)}</p>
                    )}
                    {topping.price <= 0 && hasOnlyFreeToppings && (
                      <p className="text-xs text-gray-500">Gratis</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4 space-y-3 flex-shrink-0">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Cantidad</span>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-8 h-8 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-8 h-8 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-200 rounded transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total</span>
            <p className="text-xl font-bold" style={{ color: primaryColor }}>
              {money(itemTotal)}
            </p>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full py-3 rounded-lg text-white font-bold text-center active:scale-95 transition-transform"
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
