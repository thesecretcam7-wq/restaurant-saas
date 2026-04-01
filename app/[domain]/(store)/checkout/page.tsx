'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default function CheckoutPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    delivery_type: 'pickup',
    delivery_address: '',
    payment_method: 'stripe',
    notes: '',
  })

  useEffect(() => {
    if (items.length === 0) router.replace(`/${tenantId}/menu`)
    fetch(`/api/settings/${tenantId}`).then(r => r.json()).then(setSettings)
  }, [tenantId, items.length, router])

  const subtotal = total()
  const taxRate = settings?.tax_rate || 0
  const tax = subtotal * (taxRate / 100)
  const deliveryFee = form.delivery_type === 'delivery' ? (settings?.delivery_fee || 0) : 0
  const finalTotal = subtotal + tax + deliveryFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (form.payment_method === 'stripe') {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          items,
          customerInfo: { name: form.name, phone: form.phone, email: form.email },
          deliveryType: form.delivery_type,
          deliveryAddress: form.delivery_address,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (data.url) {
        clearCart()
        window.location.href = data.url
      }
    } else {
      // Cash order
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          items,
          customerInfo: { name: form.name, phone: form.phone, email: form.email },
          deliveryType: form.delivery_type,
          deliveryAddress: form.delivery_address,
          notes: form.notes,
          paymentMethod: 'cash',
        }),
      })
      const data = await res.json()
      if (data.orderId) {
        clearCart()
        router.push(`/${tenantId}/gracias?order=${data.orderId}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/${tenantId}/carrito`} className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="font-semibold">Datos del pedido</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact */}
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Datos de contacto</h2>
            <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Nombre completo *" />
            <input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Teléfono *" type="tel" />
            <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Email (opcional)" type="email" />
          </div>

          {/* Delivery */}
          {settings?.delivery_enabled && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold">Tipo de entrega</h2>
              <div className="grid grid-cols-2 gap-3">
                {['pickup', 'delivery'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({...f, delivery_type: type}))}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${form.delivery_type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {type === 'pickup' ? '🏠 Recoger' : '🚗 Delivery'}
                    {type === 'delivery' && settings.delivery_fee > 0 && (
                      <span className="block text-xs mt-0.5 text-gray-500">+${Number(settings.delivery_fee).toLocaleString('es-CO')}</span>
                    )}
                  </button>
                ))}
              </div>
              {form.delivery_type === 'delivery' && (
                <input required value={form.delivery_address} onChange={e => setForm(f => ({...f, delivery_address: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Dirección de entrega *" />
              )}
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Método de pago</h2>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setForm(f => ({...f, payment_method: 'stripe'}))}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${form.payment_method === 'stripe' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                💳 Tarjeta
              </button>
              {settings?.cash_payment_enabled && (
                <button type="button" onClick={() => setForm(f => ({...f, payment_method: 'cash'}))}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${form.payment_method === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  💵 Efectivo
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border p-5">
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Notas del pedido (opcional)" rows={2} />
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border p-5 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>${subtotal.toLocaleString('es-CO')}</span></div>
            {tax > 0 && <div className="flex justify-between text-gray-600"><span>Impuestos ({taxRate}%)</span><span>${tax.toLocaleString('es-CO')}</span></div>}
            {deliveryFee > 0 && <div className="flex justify-between text-gray-600"><span>Delivery</span><span>${deliveryFee.toLocaleString('es-CO')}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Total</span><span>${finalTotal.toLocaleString('es-CO')}</span></div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-blue-300">
            {loading ? 'Procesando...' : form.payment_method === 'stripe' ? 'Pagar con tarjeta →' : 'Confirmar pedido →'}
          </button>
        </form>
      </main>
    </div>
  )
}
