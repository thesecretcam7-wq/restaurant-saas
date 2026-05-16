'use client'

import { use, useEffect, useState } from 'react'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import { useCartStore } from '@/lib/store/cart'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AddToCartButton from '@/components/store/AddToCartButton'

interface Props { params: Promise<{ domain: string }> }
interface RecommendedProduct {
  id: string
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  featured?: boolean
  available?: boolean
  variants?: { show_in_upsell?: boolean; requires_kitchen?: boolean } | null
}

export default function CarritoPage({ params }: Props) {
  const { domain: tenantSlug } = use(params)
  const pathname = usePathname()
  const { items, removeItem, updateQty, total } = useCartStore()
  const storeBasePath = pathname?.startsWith(`/${tenantSlug}`) ? `/${tenantSlug}` : ''
  const primary = 'var(--button-primary-color, var(--primary-color, #15130f))'
  const price = 'var(--price-color, var(--accent-color, #15130f))'
  const pageBg = 'var(--brand-background-color, #f8f5ef)'
  const surface = 'var(--brand-surface-color, #ffffff)'
  const text = 'var(--brand-text-color, #15130f)'
  const muted = 'var(--brand-muted-color, rgba(21, 19, 15, 0.62))'
  const [mounted, setMounted] = useState(false)
  const [currencyInfo, setCurrencyInfo] = useState(() => getCurrencyByCountry('ES'))
  const [tenantId, setTenantId] = useState(tenantSlug)
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([])
  const money = (amount: number) => formatPriceWithCurrency(Number(amount || 0), currencyInfo.code, currencyInfo.locale)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch(`/api/settings/${tenantSlug}`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(settings => {
        if (settings?.country || settings?.country_code) {
          setCurrencyInfo(getCurrencyByCountry(settings.country_code || settings.country))
        }
        if (settings?.tenant_id) setTenantId(settings.tenant_id)
      })
      .catch(() => {})
  }, [tenantSlug])

  useEffect(() => {
    fetch(`/api/products?domain=${encodeURIComponent(tenantSlug)}`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const products = Array.isArray(data?.items) ? data.items : []
        const cartItemIds = new Set(items.map(item => item.item_id))
        const smallItemKeywords = ['gaseosa', 'soda', 'bebida', 'agua', 'jugo', 'cerveza', 'papas', 'papita', 'salsa', 'topping', 'extra', 'combo']
        const explicitlySelected = products.filter((product: RecommendedProduct) =>
          product.available !== false &&
          product.variants?.show_in_upsell === true &&
          !cartItemIds.has(product.id)
        )
        const smallFallback = products.filter((product: RecommendedProduct) => {
          if (product.available === false || cartItemIds.has(product.id)) return false
          const haystack = `${product.name} ${product.description || ''}`.toLowerCase()
          return smallItemKeywords.some(keyword => haystack.includes(keyword))
        })
        const upsellPool = explicitlySelected.length > 0 ? explicitlySelected : smallFallback
        setRecommended(
          upsellPool
            .sort((a: RecommendedProduct, b: RecommendedProduct) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
            .slice(0, 12)
        )
      })
      .catch(() => {})
  }, [tenantSlug, items])

  if (!mounted) {
    return <div className="min-h-screen" style={{ backgroundColor: pageBg }} />
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6" style={{ backgroundColor: pageBg }}>
        <div className="w-28 h-28 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: surface }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <div className="text-center max-w-xs">
          <h2 className="text-2xl font-black mb-2 tracking-tight" style={{ color: text }}>Tu carrito está vacío</h2>
          <p className="text-sm font-medium" style={{ color: muted }}>Agrega deliciosos productos del menú para comenzar tu pedido</p>
        </div>
        <Link
          href={`${storeBasePath}/menu`}
          className="px-8 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all"
          style={{ backgroundColor: primary }}
        >
          Explorar menú
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: text }}>
      {/* Header - Professional */}
      <header className="backdrop-blur-lg border-b border-gray-100 shadow-sm sticky top-0 z-10" style={{ backgroundColor: surface }}>
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={`${storeBasePath}/menu`} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors" title="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="font-black tracking-tight" style={{ color: text }}>Tu pedido</h1>
            <p className="text-xs font-medium" style={{ color: muted }}>{items.reduce((s, i) => s + i.qty, 0)} {items.reduce((s, i) => s + i.qty, 0) === 1 ? 'producto' : 'productos'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Items */}
        <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ backgroundColor: surface }}>
          {items.map((item, idx) => (
            <div key={item.item_id} className={`flex items-center gap-3 p-4 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm line-clamp-1" style={{ color: text }}>{item.name}</p>
                {item.toppings && item.toppings.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: muted }}>
                    Adicionales: {item.toppings.map(t => t.name).join(', ')}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: muted }}>{money(item.price)} c/u</p>
                <p className="font-extrabold text-sm mt-1" style={{ color: price }}>{money(item.price * item.qty)}</p>
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
                  <span className="w-5 text-center font-extrabold text-sm" style={{ color: text }}>{item.qty}</span>
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
        <div className="rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2" style={{ backgroundColor: surface }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: text }}>Resumen</h3>
          <div className="flex justify-between text-sm" style={{ color: muted }}>
            <span>Subtotal</span>
            <span className="font-semibold" style={{ color: text }}>{money(total())}</span>
          </div>
          <div className="flex justify-between text-sm" style={{ color: muted }}>
            <span>Envío</span>
            <span className="font-semibold text-muted-foreground">Se calcula al confirmar</span>
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-extrabold" style={{ color: text }}>Total estimado</span>
            <span className="font-extrabold text-lg" style={{ color: price }}>{money(total())}</span>
          </div>
        </div>

        <CartUpsell
          products={recommended.filter(product => !items.some(item => item.item_id === product.id)).slice(0, 8)}
          tenantId={tenantId}
          money={money}
          primary={primary}
          price={price}
          surface={surface}
          text={text}
          muted={muted}
          currencyInfo={currencyInfo}
        />

        <Link
          href={`${storeBasePath}/checkout`}
          className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold shadow-xl active:scale-95 transition-transform"
          style={{ backgroundColor: primary }}
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

function CartUpsell({
  products,
  tenantId,
  money,
  primary,
  price,
  surface,
  text,
  muted,
  currencyInfo,
}: {
  products: RecommendedProduct[]
  tenantId: string
  money: (amount: number) => string
  primary: string
  price: string
  surface: string
  text: string
  muted: string
  currencyInfo: { code: string; locale: string }
}) {
  if (products.length === 0) return null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ backgroundColor: surface }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: price }}>Sugeridos</p>
          <h2 className="text-base font-black" style={{ color: text }}>Completa tu pedido</h2>
        </div>
        {products.length > 1 && (
          <span className="rounded-full border px-3 py-1 text-[11px] font-black" style={{ borderColor: 'rgba(255,255,255,.16)', color: muted }}>
            Desliza →
          </span>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-hide">
        <div className="flex w-max gap-3">
          {products.map(product => (
            <article
              key={product.id}
              className="w-[min(68vw,13rem)] shrink-0 overflow-hidden rounded-2xl border shadow-sm"
              style={{ borderColor: 'rgba(231,180,63,.22)', backgroundColor: 'rgba(255,247,223,.055)' }}
            >
              <div className="relative h-28 overflow-hidden bg-black/10">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-3xl">🍽️</div>
                )}
                <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-xs font-black shadow" style={{ color: price }}>
                  {money(product.price)}
                </span>
              </div>
              <div className="flex min-h-[7rem] flex-col p-3">
                <p className="line-clamp-2 text-sm font-black leading-5" style={{ color: text }}>{product.name}</p>
                {product.description && (
                  <p className="mt-1 line-clamp-2 text-xs font-semibold" style={{ color: muted }}>{product.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs font-black" style={{ color: price }}>{money(product.price)}</span>
                  <AddToCartButton
                    item={product}
                    tenantId={tenantId}
                    color={primary}
                    small
                    currencyInfo={currencyInfo}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
