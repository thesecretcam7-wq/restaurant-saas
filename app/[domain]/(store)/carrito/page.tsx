'use client'

import { use } from 'react'
import { formatPrice } from '@/lib/currency'
import { useCartStore } from '@/lib/store/cart'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default function CarritoPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const { items, removeItem, updateQty, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <div className="text-center max-w-xs">
          <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Tu carrito está vacío</h2>
          <p className="text-gray-600 text-sm font-medium">Agrega deliciosos productos del menú para comenzar tu pedido</p>
        </div>
        <Link
          href={`/${tenantId}/menu`}
          className="px-8 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
          style={{ backgroundColor: '#0066FF' }}
        >
          Explorar menú
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header - Professional */}
      <header className="bg-white/98 backdrop-blur-lg border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={`/${tenantId}/menu`} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors" title="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-black text-gray-900 tracking-tight">Tu pedido</h1>
            <p className="text-xs text-gray-500 font-medium">{items.reduce((s, i) => s + i.qty, 0)} {items.reduce((s, i) => s + i.qty, 0) === 1 ? 'producto' : 'productos'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.item_id} className={`flex items-center gap-3 p-4 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatPrice(item.price)} c/u</p>
                <p className="font-extrabold text-sm mt-1 text-gray-900">{formatPrice(item.price * item.qty)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => removeItem(item.item_id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
                <div className="flex items-center gap-2 bg-gray-50 rounded-full px-2 py-1">
                  <button
                    onClick={() => updateQty(item.item_id, item.qty - 1)}
                    className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 font-bold text-sm"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-extrabold text-sm text-gray-900">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.item_id, item.qty + 1)}
                    className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Resumen</h3>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="font-semibold text-gray-700">{formatPrice(total())}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Envío</span>
            <span className="font-semibold text-muted-foreground">Se calcula al confirmar</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-extrabold text-gray-900">Total estimado</span>
            <span className="font-extrabold text-gray-900 text-lg">{formatPrice(total())}</span>
          </div>
        </div>

        <Link
          href={`/${tenantId}/checkout`}
          className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold shadow-xl active:scale-95 transition-transform bg-blue-500"
        >
          <span className="text-sm">Continuar con el pedido</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </main>
    </div>
  )
}
