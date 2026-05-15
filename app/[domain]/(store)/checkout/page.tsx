'use client'

import { use, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/store/cart'
import { checkoutSchema, type CheckoutInput } from '@/lib/validations/forms'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props { params: Promise<{ domain: string }> }

const onlyDigits = (value: string) => value.replace(/\D/g, '')
const profileStorageKey = (tenantSlug: string, phone: string) => `eccofood:customer:${tenantSlug}:${onlyDigits(phone)}`

export default function CheckoutPage({ params }: Props) {
  const { domain: tenantSlug } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const storeBasePath = pathname?.startsWith(`/${tenantSlug}`) ? `/${tenantSlug}` : ''
  const { items, tenantId: cartTenantId, total, clearCart } = useCartStore()
  const [settings, setSettings] = useState<any>(null)
  const [storeBranding, setStoreBranding] = useState<{ appName?: string; logoUrl?: string | null; primaryColor?: string } | null>(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [profileLookup, setProfileLookup] = useState<'idle' | 'searching' | 'found' | 'none'>('idle')
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([])
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    delivery_type: 'pickup', delivery_address: '',
    payment_method: 'stripe', notes: '',
  })
  const tenantId = settings?.tenant_id || tenantSlug

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (items.length === 0) router.replace(getStorePath(tenantSlug, '/menu'))
    fetch(`/api/settings/${tenantSlug}`)
      .then(r => r.json())
      .then(data => {
        setSettings(data)
        if (data?.tenant_id) {
          fetch(`/api/tenant/branding?tenantId=${encodeURIComponent(data.tenant_id)}`)
            .then(r => r.json())
            .then(brandData => {
              const branding = brandData?.branding || {}
              setStoreBranding({
                appName: branding.app_name,
                logoUrl: branding.logo_url || brandData?.tenant?.logo_url || null,
                primaryColor: branding.primary_color,
              })
            })
            .catch(() => {})
        }
      })

    fetch('/api/csrf-token')
      .then(r => {
        const token = r.headers.get('x-csrf-token')
        if (token) setCsrfToken(token)
      })
      .catch(() => {})
  }, [tenantSlug, items.length, router, mounted])

  useEffect(() => {
    if (!mounted || !settings?.tenant_id || !cartTenantId || items.length === 0) return
    if (cartTenantId !== settings.tenant_id) {
      clearCart()
      toast.error('El carrito tenia productos de otro restaurante. Vuelve a elegir tu pedido.')
      router.replace(getStorePath(tenantSlug, '/menu'))
    }
  }, [mounted, settings?.tenant_id, cartTenantId, items.length, clearCart, router, tenantSlug])

  useEffect(() => {
    if (!settings) return
    if (settings.online_payment_provider === 'wompi' && settings.wompi_enabled) {
      setForm(current => ({ ...current, payment_method: 'wompi' }))
    } else if (settings.online_payment_provider === 'none' && settings.cash_payment_enabled) {
      setForm(current => ({ ...current, payment_method: 'cash' }))
    }
  }, [settings])

  useEffect(() => {
    const phoneDigits = onlyDigits(form.phone)
    if (phoneDigits.length < 7) {
      setProfileLookup('idle')
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const applyProfile = (customer: any, source: 'server' | 'local') => {
      setForm(current => ({
        ...current,
        name: current.name || customer.name || '',
        email: current.email || '',
        delivery_address: current.delivery_address || customer.delivery_address || '',
        delivery_type:
          current.delivery_type === 'pickup' && customer.delivery_type === 'delivery'
            ? 'delivery'
            : current.delivery_type,
      }))
      setProfileLookup('found')
      if (source === 'server') {
        try {
          localStorage.setItem(profileStorageKey(tenantSlug, form.phone), JSON.stringify(customer))
        } catch {}
      }
    }

    const timer = window.setTimeout(async () => {
      try {
        const localProfile = localStorage.getItem(profileStorageKey(tenantSlug, form.phone))
        if (localProfile) {
          applyProfile(JSON.parse(localProfile), 'local')
          return
        }
      } catch {}

      setProfileLookup('searching')
      try {
        const res = await fetch(
          `/api/customer-profile?tenantId=${encodeURIComponent(tenantId)}&tenantSlug=${encodeURIComponent(tenantSlug)}&phone=${encodeURIComponent(form.phone)}`,
          { signal: controller.signal }
        )
        const data = await res.json()
        if (cancelled) return
        if (data.found && data.customer) applyProfile(data.customer, 'server')
        else setProfileLookup('none')
      } catch {
        if (!cancelled) setProfileLookup('idle')
      }
    }, 550)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [form.phone, tenantId, tenantSlug])

  const subtotal = total()
  const taxRate = settings?.tax_rate || 0
  const tax = subtotal * (taxRate / 100)
  const deliveryFee = form.delivery_type === 'delivery' ? (settings?.delivery_fee || 0) : 0
  const finalTotal = subtotal + tax + deliveryFee
  const currencyInfo = getCurrencyByCountry(settings?.country || 'ES')
  const formatMoney = (amount: number) => formatPriceWithCurrency(amount, currencyInfo.code, currencyInfo.locale)
  const deliveryMinOrder = Number(settings?.delivery_min_order || 0)
  const deliveryBelowMinimum = form.delivery_type === 'delivery' && deliveryMinOrder > 0 && subtotal < deliveryMinOrder

  const saveCustomerProfile = (validated: CheckoutInput) => {
    try {
      localStorage.setItem(profileStorageKey(tenantSlug, validated.phone), JSON.stringify({
        name: validated.name,
        email: validated.email || '',
        phone: validated.phone,
        delivery_address: validated.delivery_address || '',
        delivery_type: validated.delivery_type,
      }))
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    if (deliveryBelowMinimum) {
      toast.error(`El pedido minimo para delivery es ${formatMoney(deliveryMinOrder)}`)
      return
    }

    if (form.payment_method === 'cash' && !csrfToken) {
      toast.error('Cargando seguridad del pedido. Intenta de nuevo en un segundo.')
      return
    }

    setLoading(true)

    try {
      const validated = checkoutSchema.parse(form)
      saveCustomerProfile(validated)
      const orderItems = items.map(item => ({
        ...item,
        menu_item_id: item.item_id,
        price: item.price + (item.toppings || []).reduce((sum: number, topping: any) => sum + Number(topping.price || 0), 0),
      }))

      if (form.payment_method === 'stripe') {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, tenantSlug, items: orderItems, customerInfo: { name: validated.name, phone: validated.phone, email: validated.email }, deliveryType: validated.delivery_type, deliveryAddress: validated.delivery_address, notes: validated.notes }),
        })
        const data = await res.json()
        if (data.url) {
          clearCart()
          window.dispatchEvent(new Event('store:navigation-start'))
          window.location.href = data.url
        }
        else { toast.error(data.error || 'Error al procesar') }
      } else if (form.payment_method === 'wompi') {
        const res = await fetch('/api/wompi/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, tenantSlug, items: orderItems, customerInfo: { name: validated.name, phone: validated.phone, email: validated.email }, deliveryType: validated.delivery_type, deliveryAddress: validated.delivery_address, notes: validated.notes }),
        })
        const data = await res.json()
        if (data.url) {
          clearCart()
          window.dispatchEvent(new Event('store:navigation-start'))
          window.location.href = data.url
        } else {
          toast.error(data.error || 'Error al abrir Wompi')
        }
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({ tenantId, tenantSlug, items: orderItems, customerInfo: { name: validated.name, phone: validated.phone, email: validated.email }, deliveryType: validated.delivery_type, deliveryAddress: validated.delivery_address, notes: validated.notes, paymentMethod: 'cash', source: 'store' }),
        })
        const data = await res.json()
        if (data.orderId) {
          clearCart()
          window.dispatchEvent(new Event('store:navigation-start'))
          router.push(getStorePath(tenantSlug, `/gracias?order=${data.orderId}`))
        }
        else {
          console.error('[checkout] order error', data)
          if (data.clearCart) {
            clearCart()
            window.dispatchEvent(new Event('store:navigation-start'))
            router.replace(getStorePath(tenantSlug, '/menu'))
          }
          toast.error(data.error || 'Error al crear pedido')
        }
      }
    } catch (error: any) {
      if (error.errors) {
        const validationErrors = parseValidationError(error)
        setErrors(validationErrors)
        toast.error(validationErrors[0]?.message || 'Corrige los errores del formulario')
      } else {
        toast.error('Error al procesar el pedido')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-muted-foreground"
  const primary = 'var(--button-primary-color, var(--primary-color, #15130f))'
  const pageBg = 'var(--brand-background-color, #f8f5ef)'
  const surface = 'var(--brand-surface-color, #ffffff)'
  const text = 'var(--brand-text-color, #15130f)'
  const muted = 'var(--brand-muted-color, rgba(21, 19, 15, 0.62))'

  if (!mounted) {
    return <div className="min-h-screen" style={{ backgroundColor: pageBg }} />
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: text }}>
      {loading && (
        <CheckoutStoreLoader
          logoUrl={storeBranding?.logoUrl}
          appName={storeBranding?.appName}
          primaryColor={storeBranding?.primaryColor}
        />
      )}
      <header className="border-b backdrop-blur-lg" style={{ backgroundColor: surface }}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`${storeBasePath}/carrito`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-extrabold" style={{ color: text }}>Confirmar pedido</h1>
            <p className="text-xs" style={{ color: muted }}>{items.reduce((s, i) => s + i.qty, 0)} productos</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Contact */}
          <div className="rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3" style={{ backgroundColor: surface }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: text }}>
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>1</span>
              Tus datos
            </h2>
            <div>
              <input required value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={inputCls + (getFieldError(errors, 'phone') ? ' border-red-300 focus:ring-red-500/10' : '')} placeholder="Escribe primero tu celular *" type="tel" autoComplete="tel" inputMode="tel" />
              {getFieldError(errors, 'phone') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'phone')}</p>}
              {profileLookup === 'searching' && <p className="text-xs mt-2 font-semibold text-gray-500">Buscando tus datos...</p>}
              {profileLookup === 'found' && <p className="text-xs mt-2 font-bold" style={{ color: primary }}>Datos encontrados y autocompletados</p>}
            </div>
            <div>
              <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={inputCls + (getFieldError(errors, 'name') ? ' border-red-300 focus:ring-red-500/10' : '')} placeholder="Nombre completo *" autoComplete="name" />
              {getFieldError(errors, 'name') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'name')}</p>}
            </div>
            <div>
              <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inputCls + (getFieldError(errors, 'email') ? ' border-red-300 focus:ring-red-500/10' : '')} placeholder="Email (opcional)" type="email" autoComplete="email" />
              {getFieldError(errors, 'email') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'email')}</p>}
            </div>
          </div>

          {/* Delivery */}
          {settings?.delivery_enabled && (
            <div className="rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3" style={{ backgroundColor: surface }}>
              <h2 className="font-extrabold flex items-center gap-2" style={{ color: text }}>
                <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>2</span>
                Entrega
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'pickup', label: 'Para recoger', icon: '🏠', sub: 'En el local' },
                  { value: 'delivery', label: 'A domicilio', icon: '🚗', sub: settings.delivery_fee > 0 ? `+${formatMoney(Number(settings.delivery_fee))}` : 'Gratis' },
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
                <div>
                  <input required value={form.delivery_address} onChange={e => setForm(f => ({...f, delivery_address: e.target.value}))} className={inputCls + (getFieldError(errors, 'delivery_address') ? ' border-red-300 focus:ring-red-500/10' : '')} placeholder="Dirección de entrega *" autoComplete="street-address" />
                  {getFieldError(errors, 'delivery_address') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'delivery_address')}</p>}
                  {deliveryBelowMinimum && (
                    <p className="text-red-500 text-xs mt-2">
                      El pedido minimo para delivery es {formatMoney(deliveryMinOrder)}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          <div className="rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3" style={{ backgroundColor: surface }}>
            <h2 className="font-extrabold flex items-center gap-2" style={{ color: text }}>
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>{settings?.delivery_enabled ? '3' : '2'}</span>
              Pago
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                ...(settings?.online_payment_provider === 'wompi' && settings?.wompi_enabled
                  ? [{ value: 'wompi', label: 'Wompi', icon: '💳', sub: 'Tarjeta, PSE y Nequi' }]
                  : settings?.online_payment_provider !== 'none'
                    ? [{ value: 'stripe', label: 'Tarjeta', icon: '💳', sub: 'Visa, Mastercard' }]
                    : []),
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
          <div className="rounded-2xl border border-gray-100 shadow-sm p-5" style={{ backgroundColor: surface }}>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className={inputCls + ' resize-none'} placeholder="¿Alguna nota? Alergias, indicaciones... (opcional)" rows={2} />
          </div>

          {/* Order summary */}
          <div className="rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2" style={{ backgroundColor: surface }}>
            <h3 className="font-extrabold mb-3" style={{ color: text }}>Resumen del pedido</h3>
            {items.map(item => (
              <div key={item.item_id} className="flex justify-between text-sm text-gray-600">
                <span>{item.qty}× {item.name}</span>
                <span className="font-medium">{formatMoney(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
              {tax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Impuestos ({taxRate}%)</span><span>{formatMoney(tax)}</span></div>}
              {deliveryFee > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Envío</span><span>{formatMoney(deliveryFee)}</span></div>}
              <div className="flex justify-between font-extrabold text-gray-900 text-base pt-1 border-t border-gray-100">
                <span>Total</span><span>{formatMoney(finalTotal)}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50"
            style={{ backgroundColor: primary }}>
            {loading ? 'Procesando...' : form.payment_method === 'stripe' ? '💳 Pagar con tarjeta' : form.payment_method === 'wompi' ? '💳 Pagar con Wompi' : '✅ Confirmar pedido'}
          </button>

          <p className="text-center text-xs text-muted-foreground pb-2">Tu información está protegida y segura</p>
        </form>
      </main>
    </div>
  )
}

function getStorePath(tenantSlug: string, path: string) {
  if (typeof window === 'undefined') return `/${tenantSlug}${path}`
  const host = window.location.hostname
  const isPlatformHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'eccofoodapp.com' ||
    host === 'www.eccofoodapp.com' ||
    host.endsWith('.vercel.app')

  return isPlatformHost ? `/${tenantSlug}${path}` : path
}

function CheckoutStoreLoader({
  logoUrl,
  appName,
  primaryColor,
}: {
  logoUrl?: string | null
  appName?: string
  primaryColor?: string
}) {
  const primary = primaryColor || 'var(--button-primary-color, var(--primary-color, #15130f))'

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-white/75 px-5 backdrop-blur-[10px]">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[34px] border border-white/80 bg-white/98 p-8 text-center text-[#15130f] shadow-[0_30px_100px_rgba(0,0,0,0.2)]">
        <div
          className="relative mx-auto grid size-28 place-items-center rounded-[30px] text-4xl font-black text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)]"
          style={{ backgroundColor: primary }}
        >
          <span
            className="absolute inset-0 rounded-2xl"
            style={{
              backgroundColor: primary,
              animation: 'storeLoaderGlow 1.35s ease-in-out infinite',
            }}
          />
          {logoUrl ? (
            <img src={logoUrl} alt={appName || ''} className="relative h-32 w-40 object-contain drop-shadow-2xl" />
          ) : (
            <span className="relative">{appName?.charAt(0) || 'R'}</span>
          )}
        </div>

        <div className="mt-7 flex items-center justify-center gap-0.5 text-3xl font-black tracking-wide">
          {'Cargando'.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="inline-block"
              style={{
                color: primary,
                animation: 'storeLoadingText 1.15s ease-in-out infinite',
                animationDelay: `${index * 65}ms`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        <p className="mt-3 text-sm font-bold text-black/45">Confirmando tu pedido</p>
        <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: primary,
              animation: 'storeLoaderBar 1.15s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
