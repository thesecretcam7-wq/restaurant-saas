import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { deriveBrandPalette } from '@/lib/brand-colors'
import { formatPriceWithCurrency, getCurrencyByCountry } from '@/lib/currency'
import Link from 'next/link'
import { headers } from 'next/headers'
import { WompiReturnVerifier } from './WompiReturnVerifier'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ order?: string; provider?: string; reference?: string; id?: string; 'transaction.id'?: string }>
}

export default async function GraciasPage({ params, searchParams }: Props) {
  const { domain: tenantId } = await params
  const headersList = await headers()
  const hostname = (headersList.get('host') || '').split(':')[0]?.toLowerCase() || ''
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
  const isCustomDomain = Boolean(hostname && !hostname.includes(baseDomain) && !hostname.includes('localhost') && !hostname.endsWith('.vercel.app'))
  const search = await searchParams
  const { order: orderId } = search
  const wompiTransactionId = search.id || search['transaction.id']
  const context = await getTenantContext(tenantId)
  const { branding } = context
  const tenantSlug = context.tenant?.slug || tenantId
  const storeBasePath = isCustomDomain ? '' : `/${tenantSlug}`
  const brandingValues = branding as any
  const palette = deriveBrandPalette({
    primary: brandingValues?.primary_color,
    secondary: brandingValues?.secondary_color,
    accent: brandingValues?.accent_color,
    background: brandingValues?.background_color,
    surface: brandingValues?.surface_color,
    buttonPrimary: brandingValues?.button_primary_color,
    buttonSecondary: brandingValues?.button_secondary_color,
    textPrimary: brandingValues?.text_primary_color,
    textSecondary: brandingValues?.text_secondary_color,
    border: brandingValues?.border_color,
  })
  const primary = palette.buttonPrimary
  const price = palette.accent
  const currencyInfo = getCurrencyByCountry(context.settings?.country_code || context.settings?.country || (context.tenant as any)?.country || 'ES')
  const money = (amount: number) => formatPriceWithCurrency(Number(amount || 0), currencyInfo.code, currencyInfo.locale)

  let order = null
  if (orderId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('orders')
      .select('order_number, total, payment_method, status, customer_name')
      .eq('id', orderId)
      .single()
    order = data
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      {/* Success animation ring */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}15` }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}25` }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: primary }}>
              ✓
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1 text-center">
        {order?.customer_name ? `¡Gracias, ${order.customer_name.split(' ')[0]}!` : '¡Pedido recibido!'}
      </h1>
      {order?.payment_method === 'wompi' ? (
        <p className="text-muted-foreground text-sm text-center mb-6 max-w-xs">
          Estamos verificando tu pago con Wompi. El pedido se confirma cuando el pago sea aprobado.
        </p>
      ) : (
      <p className="text-muted-foreground text-sm text-center mb-6 max-w-xs">
        Tu pedido está confirmado y pronto lo estaremos preparando con todo el amor 🍽️
      </p>
      )}

      {search.provider === 'wompi' && (
        <WompiReturnVerifier
          orderId={orderId}
          reference={search.reference}
          transactionId={wompiTransactionId}
        />
      )}

      {order && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full max-w-sm mb-6 space-y-3">
          <h3 className="font-extrabold text-gray-900 text-sm">Detalles del pedido</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Número</span>
              <span className="font-bold text-gray-900 font-mono text-sm">{order.order_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-extrabold text-lg" style={{ color: price }}>{money(Number(order.total))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pago</span>
              <span className="font-semibold text-sm text-gray-800">{order.payment_method === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${primary}15`, color: primary }}>
                {order.payment_method === 'wompi' ? 'Verificando pago' : 'En preparacion'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-3">
        <Link
          href={`${storeBasePath}/mis-pedidos`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
          style={{ backgroundColor: primary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Seguir mi pedido
        </Link>
        <Link
          href={`${storeBasePath}/menu`}
          className="flex items-center justify-center w-full py-3.5 rounded-2xl text-gray-600 font-bold text-sm bg-white border border-gray-200 active:scale-95 transition-transform"
        >
          Pedir algo más
        </Link>
      </div>
    </div>
  )
}
