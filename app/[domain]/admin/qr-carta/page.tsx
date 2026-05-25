import { createServiceClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant'
import { getPageConfig } from '@/lib/pageConfig'
import QRCode from 'qrcode'
import { Download, ExternalLink, QrCode, Smartphone } from 'lucide-react'
import Link from 'next/link'

interface Props { params: Promise<{ domain: string }> }

export default async function CartaQrPage({ params }: Props) {
  const { domain } = await params
  const supabase = createServiceClient()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)

  const [tenantRes, context] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, slug, organization_name, primary_domain, logo_url, metadata')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single(),
    getTenantContext(domain),
  ])
  const tenant = tenantRes.data

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
  const branding = (context.branding || {}) as Record<string, any>
  const pageConfig = getPageConfig((tenant as any)?.metadata?.page_config || branding.page_config)
  const isLightTheme = pageConfig.appearance.theme_mode === 'light'
  const theme = isLightTheme
    ? {
        primary: '#ff5a00',
        accent: '#ff1f1f',
        surface: '#ffffff',
        soft: '#fff3e8',
        text: '#07111f',
        muted: 'rgba(7, 17, 31, 0.62)',
        border: 'rgba(7, 17, 31, 0.12)',
        qrDark: '#07111f',
        qrLight: '#ffffff',
      }
    : {
        primary: '#D4AF37',
        accent: '#D35A37',
        surface: '#1A1F2C',
        soft: 'rgba(212, 175, 55, 0.12)',
        text: '#ffffff',
        muted: '#8b97a8',
        border: 'rgba(212, 175, 55, 0.18)',
        qrDark: '#0B0E14',
        qrLight: '#ffffff',
      }
  const isLocalApp = appUrl.includes('localhost') || appUrl.includes('127.0.0.1') || baseDomain.includes('localhost')
  const cartaUrl = tenant.primary_domain
    ? `https://${tenant.primary_domain}/carta`
    : isLocalApp
      ? `${appUrl}/${tenantSlug}/carta`
      : `https://${tenantSlug}.${baseDomain}/carta`
  const qrDataUrl = await QRCode.toDataURL(cartaUrl, {
    width: 720,
    margin: 2,
    color: { dark: theme.qrDark, light: theme.qrLight },
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
          className="hidden h-11 items-center gap-2 rounded-xl border px-4 text-sm font-black transition sm:inline-flex"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }}
        >
          <ExternalLink className="size-4" />
          Abrir carta
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="admin-panel p-5">
          <div className="rounded-2xl border p-5 text-center shadow-sm" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="mx-auto mb-4 h-24 w-32 object-contain drop-shadow-xl" />
            ) : (
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: theme.primary, color: isLightTheme ? '#07111f' : '#0B0E14' }}>
                {tenant.organization_name?.charAt(0) || 'E'}
              </div>
            )}
            <h2 className="text-xl font-black" style={{ color: theme.text }}>{tenant.organization_name}</h2>
            <p className="mt-1 text-sm font-bold" style={{ color: theme.muted }}>Escanea para ver la carta</p>
            <img src={qrDataUrl} alt="QR de la carta" className="mx-auto mt-5 w-full max-w-[300px] rounded-2xl bg-white" />
          </div>
          <a
            href={qrDataUrl}
            download={`qr-carta-${tenant.slug || tenant.id}.png`}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white transition"
            style={{ backgroundColor: theme.accent }}
          >
            <Download className="size-4" />
            Descargar QR
          </a>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="admin-panel p-5">
            <QrCode className="size-7" style={{ color: theme.accent }} />
            <h3 className="mt-5 text-lg font-black" style={{ color: theme.text }}>URL de la carta</h3>
            <p className="mt-2 break-all rounded-xl px-4 py-3 text-sm font-bold" style={{ backgroundColor: theme.soft, color: theme.muted }}>{cartaUrl}</p>
          </article>
          <article className="admin-panel p-5">
            <Smartphone className="size-7" style={{ color: theme.accent }} />
            <h3 className="mt-5 text-lg font-black" style={{ color: theme.text }}>Uso recomendado</h3>
            <p className="mt-2 text-sm font-semibold leading-6" style={{ color: theme.muted }}>
              Ponlo en mesas, entrada o caja. El cliente abre una carta de consulta rapida, diferente a la tienda online.
            </p>
          </article>
          <article className="admin-panel p-5 md:col-span-2">
            <h3 className="text-lg font-black" style={{ color: theme.text }}>Cuando cambies productos o branding</h3>
            <p className="mt-2 text-sm font-semibold leading-6" style={{ color: theme.muted }}>
              No tienes que generar otro QR. El codigo apunta siempre a la misma carta, y la carta muestra los cambios guardados en productos, categorias, imagenes y marca.
            </p>
          </article>
        </section>
      </div>
    </div>
  )
}
