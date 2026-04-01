'use client'

import { use } from 'react'
import { useCartStore } from '@/lib/store/cart'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default function CarritoPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const { items, removeItem, updateQty, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <span className="text-5xl">🛒</span>
        <h2 className="text-xl font-semibold text-gray-700">Tu carrito está vacío</h2>
        <Link href={`/${tenantId}/menu`} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium">
          Ver menú
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/${tenantId}/menu`} className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="font-semibold">Tu pedido</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border divide-y">
          {items.map(item => (
            <div key={item.item_id} className="flex items-center gap-3 p-4">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-sm text-gray-500">${item.price.toLocaleString('es-CO')} c/u</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.item_id, item.qty - 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-600 hover:bg-gray-50">-</button>
                <span className="w-6 text-center font-medium">{item.qty}</span>
                <button onClick={() => updateQty(item.item_id, item.qty + 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
              </div>
              <p className="font-semibold w-20 text-right">${(item.price * item.qty).toLocaleString('es-CO')}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total().toLocaleString('es-CO')}</span>
          </div>
        </div>

        <Link
          href={`/${tenantId}/checkout`}
          className="block w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-center hover:bg-blue-700"
        >
          Continuar con el pedido →
        </Link>
      </main>
    </div>
  )
}
