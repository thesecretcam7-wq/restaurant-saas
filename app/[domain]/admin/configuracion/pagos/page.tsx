import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { CreditCard, MapPin, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { getCurrencyByCountry } from '@/lib/currency'
import { PaymentsOnlineForm } from './PaymentsOnlineForm'

interface Props { params: Promise<{ domain: string }> }

type PaymentTenant = {
  id: string
  slug: string | null
  organization_name: string | null
  country: string | null
  stripe_account_id: string | null
  stripe_account_status: string | null
}

type PaymentSettings = {
  country: string | null
  online_payment_provider: string | null
  wompi_enabled: boolean | null
  wompi_public_key: string | null
}

function providerStatus(active: boolean, connected: boolean) {
  if (active && connected) return { label: 'Activo', className: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30' }
  if (connected) return { label: 'Conectado', className: 'bg-[#d9a441]/15 text-[#f2cf82] border-[#d9a441]/35' }
  return { label: 'Pendiente', className: 'bg-white/10 text-[#fff4d8]/70 border-white/15' }
}

export default async function PagosOnlinePage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, country, stripe_account_id, stripe_account_status')
    .eq(isUUID ? 'id' : 'slug', domain)
    .maybeSingle<PaymentTenant>()

  const { data: settings } = tenant?.id
    ? await supabase
      .from('restaurant_settings')
      .select('country, online_payment_provider, wompi_enabled, wompi_public_key')
      .eq('tenant_id', tenant.id)
      .maybeSingle<PaymentSettings>()
    : { data: null }

  const tenantSlug = tenant?.slug || domain
  const country = String(settings?.country || tenant?.country || 'ES').toUpperCase()
  const currency = getCurrencyByCountry(country)
  const stripeConnected = tenant?.stripe_account_status === 'verified'
  const stripeActive = settings?.online_payment_provider === 'stripe'
  const wompiAvailable = country === 'CO'
  const wompiConnected = Boolean(settings?.wompi_public_key)
  const wompiActive = settings?.online_payment_provider === 'wompi' && Boolean(settings?.wompi_enabled)
  const stripeStatus = providerStatus(stripeActive, stripeConnected)
  const wompiStatus = providerStatus(wompiActive, wompiConnected)

  const providers = [
    {
      name: 'Stripe',
      countryLabel: 'Europa, Estados Unidos y mercados internacionales',
      description: 'Tarjetas y pagos online internacionales. Recomendado para restaurantes fuera de Colombia.',
      href: `/${tenantSlug}/admin/configuracion/stripe`,
      Icon: CreditCard,
      status: stripeStatus,
      available: true,
      cta: stripeConnected ? 'Gestionar Stripe' : 'Conectar Stripe',
    },
    {
      name: 'Wompi',
      countryLabel: 'Colombia',
      description: 'Pagos online en pesos colombianos para comercios registrados en Colombia.',
      href: '#pagos-online-form',
      Icon: Smartphone,
      status: wompiStatus,
      available: wompiAvailable,
      cta: wompiAvailable ? (wompiConnected ? 'Gestionar Wompi' : 'Configurar Wompi') : 'Disponible en Colombia',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Conexiones de cobro</p>
          <h1 className="admin-title">Pagos online</h1>
          <p className="admin-subtitle">
            Elige el proveedor correcto segun el pais del restaurante. La ubicacion del dueño no cambia esta configuracion.
          </p>
        </div>
      </div>

      <section className="admin-panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-[#d9a441]/20 text-[#f2cf82]">
              <MapPin className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#fff4d8]">{tenant?.organization_name || 'Restaurante'}</h2>
              <p className="mt-1 text-sm font-semibold text-[#fff4d8]/65">
                Pais configurado: <strong>{country}</strong> · Moneda: <strong>{currency.code}</strong>
              </p>
            </div>
          </div>
          <Link
            href="#pagos-online-form"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d9a441]/40 bg-[#d9a441]/15 px-4 text-sm font-black text-[#f2cf82] transition hover:bg-[#d9a441]/25"
          >
            Cambiar pais y moneda
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map(({ name, countryLabel, description, href, Icon, status, available, cta }) => (
          <article key={name} className={`admin-panel p-5 ${available ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#d9a441]/18 text-[#f2cf82]">
                <Icon className="size-6" />
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
                {available ? status.label : 'No disponible'}
              </span>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#d9a441]">{countryLabel}</p>
            <h2 className="mt-2 text-2xl font-black text-[#fff4d8]">{name}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#fff4d8]/62">{description}</p>
            <Link
              href={href}
              className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                available
                  ? 'bg-gradient-to-br from-[#f2cf82] via-[#d9a441] to-[#b85c1f] text-[#080704] shadow-lg shadow-[#d9a441]/20'
                  : 'border border-white/15 bg-white/8 text-[#fff4d8]/65'
              }`}
            >
              <WalletCards className="size-4" />
              {cta}
            </Link>
          </article>
        ))}
      </div>

      {tenant?.id && <PaymentsOnlineForm tenantId={tenant.id} />}

      <section className="admin-panel p-5">
        <div className="flex gap-3">
          <span className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-200">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-black text-[#fff4d8]">Regla de seguridad</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#fff4d8]/60">
              Wompi solo se activa cuando el restaurante esta configurado en Colombia. Stripe queda disponible para paises internacionales.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
