import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { CreditCard, Download, MapPin, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { getCurrencyByCountry } from '@/lib/currency'
import { getPaymentConfig, selectSettingsWithPaymentFallback } from '@/lib/payment-settings'

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
  if (active && connected) return { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (connected) return { label: 'Conectado', className: 'bg-orange-50 text-orange-700 border-orange-200' }
  return { label: 'Pendiente', className: 'bg-slate-50 text-slate-600 border-slate-200' }
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

  const { data: settingsRow } = tenant?.id
    ? await selectSettingsWithPaymentFallback(
      supabase,
      tenant.id,
      'country, printer_settings, online_payment_provider, wompi_enabled, wompi_public_key',
      'country, printer_settings'
    )
    : { data: null }

  const tenantSlug = tenant?.slug || domain
  const settings = getPaymentConfig(settingsRow, tenant?.country || 'ES') as PaymentSettings
  const country = String(settings.country || tenant?.country || 'ES').toUpperCase()
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
      href: `/${tenantSlug}/admin/configuracion/wompi`,
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
            <span className="grid size-11 flex-shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
              <MapPin className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">{tenant?.organization_name || 'Restaurante'}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Pais configurado: <strong>{country}</strong> · Moneda: <strong>{currency.code}</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map(({ name, countryLabel, description, href, Icon, status, available, cta }) => (
          <article key={name} className={`admin-panel p-5 ${available ? '' : 'opacity-70'}`}>
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                <Icon className="size-6" />
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
                {available ? status.label : 'No disponible'}
              </span>
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-orange-600">{countryLabel}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{name}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</p>
            <Link
              href={href}
              className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                available
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600'
                  : 'border border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <WalletCards className="size-4" />
              {cta}
            </Link>
          </article>
        ))}
      </div>

      <section className="admin-panel p-5">
        <div className="flex gap-3">
          <span className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-950">Regla de seguridad</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
              Wompi solo se activa cuando el restaurante esta configurado en Colombia. Stripe queda disponible para paises internacionales.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-panel p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <span className="grid size-12 flex-shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Smartphone className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">APK Android</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">TPV nativo con Tap to Pay</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                App Android aislada del TPV web. Se configura con el correo y contrasena del restaurante, muestra los pedidos pendientes y permite cobrar tickets o mesas completas con Tap to Pay.
              </p>
            </div>
          </div>
          <a
            href="/downloads/eccofood-camarero-tap-to-pay.apk"
            download
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            <Download className="size-4" />
            Descargar APK
          </a>
        </div>
      </section>
    </div>
  )
}
