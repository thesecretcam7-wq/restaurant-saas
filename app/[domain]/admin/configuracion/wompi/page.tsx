import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { ArrowLeft, ShieldCheck, Smartphone } from 'lucide-react'
import { PaymentsOnlineForm } from '../pagos/PaymentsOnlineForm'

interface Props { params: Promise<{ domain: string }> }

type WompiTenant = {
  id: string
  slug: string | null
  organization_name: string | null
}

type WompiSettings = {
  country: string | null
  online_payment_provider: string | null
  wompi_enabled: boolean | null
  wompi_public_key: string | null
}

export default async function WompiConfigPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name')
    .eq(isUUID ? 'id' : 'slug', domain)
    .maybeSingle<WompiTenant>()

  const { data: settings } = tenant?.id
    ? await supabase
      .from('restaurant_settings')
      .select('country, online_payment_provider, wompi_enabled, wompi_public_key')
      .eq('tenant_id', tenant.id)
      .maybeSingle<WompiSettings>()
    : { data: null }

  const tenantSlug = tenant?.slug || domain
  const isColombia = String(settings?.country || '').toUpperCase() === 'CO'
  const isActive = settings?.online_payment_provider === 'wompi' && Boolean(settings?.wompi_enabled)
  const hasKeys = Boolean(settings?.wompi_public_key)

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <Link
            href={`/${tenantSlug}/admin/configuracion/pagos`}
            className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#f2cf82] transition hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver a pagos online
          </Link>
          <p className="admin-eyebrow">Colombia</p>
          <h1 className="admin-title">Wompi</h1>
          <p className="admin-subtitle">
            Configura pagos online en pesos colombianos para la tienda, carta QR, kiosko y checkout.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="admin-panel p-5">
          <Smartphone className="size-6 text-[#d9a441]" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d9a441]">Pais</p>
          <h2 className="mt-1 text-xl font-black text-[#fff4d8]">{isColombia ? 'Colombia' : 'Pendiente'}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#fff4d8]/58">
            Wompi solo se habilita cuando el pais real del restaurante es Colombia.
          </p>
        </article>
        <article className="admin-panel p-5">
          <ShieldCheck className="size-6 text-[#d9a441]" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d9a441]">Credenciales</p>
          <h2 className="mt-1 text-xl font-black text-[#fff4d8]">{hasKeys ? 'Guardadas' : 'Sin configurar'}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#fff4d8]/58">
            La llave privada y la integridad se guardan protegidas en servidor.
          </p>
        </article>
        <article className="admin-panel p-5">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
            isActive ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200' : 'border-white/15 bg-white/10 text-[#fff4d8]/70'
          }`}>
            {isActive ? 'Activo' : 'Pendiente'}
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d9a441]">Estado</p>
          <h2 className="mt-1 text-xl font-black text-[#fff4d8]">{isActive ? 'Recibiendo pagos' : 'No activo'}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#fff4d8]/58">
            Activa Wompi cuando las llaves del comercio esten listas.
          </p>
        </article>
      </div>

      {tenant?.id ? (
        <PaymentsOnlineForm tenantId={tenant.id} mode="wompi" />
      ) : (
        <div className="admin-empty">No pude cargar este restaurante.</div>
      )}
    </div>
  )
}
