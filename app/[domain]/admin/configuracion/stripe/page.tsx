import { createServiceClient } from '@/lib/supabase/server'
import { CreditCard, ShieldCheck, Zap } from 'lucide-react'
import { StripeConnectClient } from './StripeConnectClient'

interface Props { params: Promise<{ domain: string }> }

export default async function StripeConnectPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, stripe_account_id, stripe_account_status, stripe_customer_id')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  const isConnected = tenant?.stripe_account_status === 'verified'
  const isPending = tenant?.stripe_account_status === 'pending'

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Pagos online</p>
          <h1 className="admin-title">Stripe</h1>
          <p className="admin-subtitle">Conecta la cuenta del restaurante para cobrar desde tienda, QR y kiosko.</p>
        </div>
      </div>

      <div className={`rounded-2xl border p-5 ${
        isConnected ? 'border-emerald-200 bg-emerald-50' : isPending ? 'border-amber-200 bg-amber-50' : 'border-black/10 bg-white'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`grid size-12 flex-shrink-0 place-items-center rounded-xl ${
            isConnected ? 'bg-emerald-600 text-white' : isPending ? 'bg-amber-500 text-white' : 'bg-[#15130f] text-white'
          }`}>
            <CreditCard className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#15130f]">
              {isConnected ? 'Stripe conectado' : isPending ? 'Conexion pendiente' : 'Stripe no conectado'}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-black/58">
              {isConnected
                ? `Cuenta conectada: ${tenant?.stripe_account_id}. El restaurante puede recibir pagos online.`
                : isPending
                ? 'Falta completar informacion dentro de Stripe para activar los cobros.'
                : 'Conecta Stripe para que los clientes puedan pagar directamente desde la carta, tienda o kiosko.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ['1', 'Cuenta segura', 'Stripe valida la identidad del restaurante y la cuenta bancaria.', ShieldCheck],
          ['2', 'Pago del cliente', 'El cliente paga con tarjeta desde un enlace seguro de Stripe.', CreditCard],
          ['3', 'Dinero directo', 'Los fondos llegan a la cuenta del restaurante segun los tiempos de Stripe.', Zap],
        ].map(([step, title, text, Icon]) => (
          <article key={String(step)} className="admin-panel p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-[#15130f] text-sm font-black text-white">{String(step)}</span>
              <Icon className="size-5 text-[#e43d30]" />
            </div>
            <h3 className="mt-5 text-base font-black text-[#15130f]">{String(title)}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/55">{String(text)}</p>
          </article>
        ))}
      </div>

      {tenant && !isConnected && (
        <StripeConnectClient tenantId={tenant.id} tenantSlug={tenant.slug || domain} isPending={!!isPending} />
      )}

      {isConnected && (
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-[#635BFF] px-5 text-sm font-black text-white shadow-lg shadow-indigo-900/15 transition hover:bg-[#5148f0]"
        >
          Abrir dashboard de Stripe
        </a>
      )}
    </div>
  )
}
