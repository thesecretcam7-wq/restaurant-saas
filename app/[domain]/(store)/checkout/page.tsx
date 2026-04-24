'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default function CheckoutPage({ params }: Props) {
  const { domain: tenantSlug } = use(params)
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    delivery_type: 'pickup', delivery_address: '',
    payment_method: 'stripe', notes: '',
  })

  useEffect(() => {
    if (items.length === 0) router.replace(`/${tenantSlug}/menu`)
    fetch(`/api/settings/${tenantSlug}`)
      .then(r => r.json())
      .then(data => {
        setSettings(data)
      })
  }, [tenantSlug, items.length, router])

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
        body: JSON.stringify({ tenantId: tenantSlug, items, customerInfo: { name: form.name, phone: form.phone, email: form.email }, deliveryType: form.delivery_type, deliveryAddress: form.delivery_address, notes: form.notes }),
      })
      const data = await res.json()
      if (data.url) { clearCart(); window.location.href = data.url }
    } else {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantSlug, items, customerInfo: { name: form.name, phone: form.phone, email: form.email }, deliveryType: form.delivery_type, deliveryAddress: form.delivery_address, notes: form.notes, paymentMethod: 'cash' }),
      })
      const data = await res.json()
      if (data.orderId) { clearCart(); router.push(`/${tenantSlug}/gracias?order=${data.orderId}`) }
    }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-muted-foreground"
  const primary = 'var(--primary-color, #3B82F6)'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/${tenantSlug}/carrito`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-extrabold text-gray-900">Confirmar pedido</h1>
            <p className="text-xs text-muted-foreground">{items.reduce((s, i) => s + i.qty, 0)} productos</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>1</span>
              Tus datos
            </h2>
            <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inputCls} placeholder="Nombre completo *" />
            <input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={inputCls} placeholder="Teléfono *" type="tel" />
            <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inputCls} placeholder="Email (opcional)" type="email" />
          </div>

          {/* Delivery */}
          {settings?.delivery_enabled && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>2</span>
                Entrega
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'pickup', label: 'Para recoger', icon: '🏠', sub: 'En el local' },
                  { value: 'delivery', label: 'A domicilio', icon: '🚗', sub: settings.delivery_fee > 0 ? `+$${Number(settings.delivery_fee).toLocaleString('es-CO')}` : 'Gratis' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({...f, delivery_type: opt.value}))}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all ${form.delivery_type === opt.value ? 'border-current bg-opacity-5' : 'border-gray-200 hover:border-gray-300'}`}
                    style={form.delivery_type === opt.value ? { borderColor: primary, backgroundColor: `color-mix(in srgb, ${primary} 8%, white)` } : {}}>
                    <span className="block text-xl mb-1">{opt.icon}</span>
                    <span className="block text-sm font-bold text-gray-900">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {form.delivery_type === 'delivery' && (
                <input required value={form.delivery_address} onChange={e => setForm(f => ({...f, delivery_address: e.target.value}))} className={inputCls} placeholder="Dirección de entrega *" />
              )}
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>{settings?.delivery_enabled ? '3' : '2'}</span>
              Pago
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'stripe', label: 'Tarjeta', icon: '💳', sub: 'Visa, Mastercard' },
                ...(settings?.cash_payment_enabled ? [{ value: 'cash', label: 'Efectivo', icon: '💵', sub: 'Al entregar' }] : []),
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm(f => ({...f, payment_method: opt.value}))}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${form.payment_method === opt.value ? 'border-current' : 'border-gray-200 hover:border-gray-300'}`}
                  style={form.payment_method === opt.value ? { borderColor: primary, backgroundColor: `color-mix(in srgb, ${primary} 8%, white)` } : {}}>
                  <span className="block text-xl mb-1">{opt.icon}</span>
                  <span className="block text-sm font-bold text-gray-900">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className={inputCls + ' resize-none'} placeholder="¿Alguna nota? Alergias, indicaciones... (opcional)" rows={2} />
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
            <h3 className="font-extrabold text-gray-900 mb-3">Resumen del pedido</h3>
            {items.map(item => (
              <div key={item.item_id} className="flex justify-between text-sm text-gray-600">
                <span>{item.qty}× {item.name}</span>
                <span className="font-medium">${(item.price * item.qty).toLocaleString('es-CO')}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>${subtotal.toLocaleString('es-CO')}</span></div>
              {tax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Impuestos ({taxRate}%)</span><span>${tax.toLocaleString('es-CO')}</span></div>}
              {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Envío</span><span>${deliveryFee.toLocaleString('es-CO')}</span></div>}
              <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total</span><span>${finalTotal.toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50"
            style={{ backgroundColor: primary }}>
            {loading ? 'Procesando...' : form.payment_method === 'stripe' ? '💳 Pagar con tarjeta' : '✅ Confirmar pedido'}
          </button>

          <p className="text-center text-xs text-muted-foreground pb-2">Tu información está protegida y segura</p>
        </form>
      </main>
    </div>
  )
}
