import { createServiceClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { Download, ExternalLink, QrCode, Smartphone } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default async function CartaQrPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, primary_domain, logo_url')
    .eq(isUUID ? 'id' : 'slug', domain)
    .single()

  if (!tenant) {
    return (
      <div className="admin-panel p-6">
        <h1 className="text-xl font-black text-[#15130f]">Restaurante no encontrado</h1>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
  const tenantSlug = tenant.slug || tenant.id
  const isLocalApp = appUrl.includes('localhost') || appUrl.includes('127.0.0.1') || baseDomain.includes('localhost')
  const cartaUrl = tenant.primary_domain
    ? `https://${tenant.primary_domain}/carta`
    : isLocalApp
      ? `${appUrl}/${tenantSlug}/carta`
      : `https://${tenantSlug}.${baseDomain}/carta`
  const qrDataUrl = await QRCode.toDataURL(cartaUrl, {
    width: 720,
    margin: 2,
    color: { dark: '#15130f', light: '#ffffff' },
  })

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Carta digital</p>
          <h1 className="admin-title">{tenant.organization_name || tenantSlug} | QR de la carta</h1>
          <p className="admin-subtitle">Imprime este QR para que el cliente vea la carta desde su celular.</p>
        </div>
        <Link
          href={cartaUrl}
          target="_blank"
          className="hidden h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-[#15130f] transition hover:bg-black/[0.04] sm:inline-flex"
        >
          <ExternalLink className="size-4" />
          Abrir carta
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="admin-panel p-5">
          <div className="rounded-2xl border border-black/10 bg-white p-5 text-center shadow-sm">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="mx-auto mb-4 h-24 w-32 object-contain drop-shadow-xl" />
            ) : (
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-[#15130f] text-xl font-black text-white">
                {tenant.organization_name?.charAt(0) || 'E'}
              </div>
            )}
            <h2 className="text-xl font-black text-[#15130f]">{tenant.organization_name}</h2>
            <p className="mt-1 text-sm font-bold text-black/45">Escanea para ver la carta</p>
            <img src={qrDataUrl} alt="QR de la carta" className="mx-auto mt-5 w-full max-w-[300px] rounded-2xl bg-white" />
          </div>
          <a
            href={qrDataUrl}
            download={`qr-carta-${tenant.slug || tenant.id}.png`}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#15130f] text-sm font-black text-white transition hover:bg-black"
          >
            <Download className="size-4" />
            Descargar QR
          </a>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="admin-panel p-5">
            <QrCode className="size-7 text-[#e43d30]" />
            <h3 className="mt-5 text-lg font-black text-[#15130f]">URL de la carta</h3>
            <p className="mt-2 break-all rounded-xl bg-black/[0.04] px-4 py-3 text-sm font-bold text-black/58">{cartaUrl}</p>
          </article>
          <article className="admin-panel p-5">
            <Smartphone className="size-7 text-[#e43d30]" />
            <h3 className="mt-5 text-lg font-black text-[#15130f]">Uso recomendado</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
              Ponlo en mesas, entrada o caja. El cliente abre una carta de consulta rapida, diferente a la tienda online.
            </p>
          </article>
          <article className="admin-panel p-5 md:col-span-2">
            <h3 className="text-lg font-black text-[#15130f]">Cuando cambies productos o branding</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
              No tienes que generar otro QR. El codigo apunta siempre a la misma carta, y la carta muestra los cambios guardados en productos, categorias, imagenes y marca.
            </p>
          </article>
        </section>
      </div>
    </div>
  )
}
