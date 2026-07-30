import { getTenantContext } from '@/lib/tenant'
import ClientToaster from '@/components/ClientToaster'
import StoreNavigationLoader from '@/components/store/StoreNavigationLoader'
import StoreBrandingMemory from '@/components/store/StoreBrandingMemory'
import TenantPwaManifestLink from '@/components/TenantPwaManifestLink'
import TenantAccessGuard from '@/components/TenantAccessGuard'
import { getTenantAccessInfo } from '@/lib/tenant-access'
import { getPageConfig } from '@/lib/pageConfig'
import {
  EL_CRUCE_ADDRESS,
  EL_CRUCE_EMAIL,
  EL_CRUCE_KEYWORDS,
  EL_CRUCE_LOCAL_PAGES,
  EL_CRUCE_PHONE,
  EL_CRUCE_PUBLIC_URL,
  isElCruceIdentity,
} from '@/lib/el-cruce-seo'
import type { Metadata } from 'next'
import './(store)/store-premium.css'

export const dynamic = 'force-dynamic'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

function getRestaurantDisplayName(context: Awaited<ReturnType<typeof getTenantContext>>) {
  return context.branding?.app_name || context.tenant?.organization_name || context.tenant?.slug || 'Restaurante'
}

function getTenantPublicUrl(context: Awaited<ReturnType<typeof getTenantContext>>, fallbackDomain: string) {
  if (context.tenant?.primary_domain) return `https://${context.tenant.primary_domain}`
  const slug = context.tenant?.slug || fallbackDomain
  return `https://${slug}.eccofoodapp.com`
}

function isElCruce(context: Awaited<ReturnType<typeof getTenantContext>>) {
  return isElCruceIdentity(context.tenant?.slug, context.tenant?.organization_name)
}

function getSeoDescription(context: Awaited<ReturnType<typeof getTenantContext>>, restaurantName: string) {
  const tenantSeo = (context.tenant as any)?.metadata?.seo
  if (tenantSeo?.description) return tenantSeo.description

  if (isElCruce(context)) {
    return 'Cafe Bar El Cruce en El Palmar, Murcia: desayunos, cafe, tapas murcianas, marineras, bocadillos y raciones en Carr. Mazarron, 9, frente a DCORASIA. Consulta la carta online y escribe por WhatsApp.'
  }

  return context.branding?.tagline || context.branding?.description || `Tienda online de ${restaurantName}`
}

function getSeoTitle(context: Awaited<ReturnType<typeof getTenantContext>>, restaurantName: string) {
  const tenantSeo = (context.tenant as any)?.metadata?.seo
  if (tenantSeo?.title) return tenantSeo.title

  if (isElCruce(context)) {
    return `${restaurantName} | Desayunos, tapas y raciones en El Palmar`
  }

  return restaurantName
}

function getRestaurantJsonLd(
  context: Awaited<ReturnType<typeof getTenantContext>>,
  restaurantName: string,
  publicUrl: string,
) {
  const settings = context.settings as any
  const branding = context.branding as any
  const pageConfig = getPageConfig((context.tenant as any)?.metadata?.page_config || branding?.page_config)
  const social = pageConfig.social || {}
  const description = getSeoDescription(context, restaurantName)
  const elCruce = isElCruce(context)
  const streetAddress = elCruce ? EL_CRUCE_ADDRESS : settings?.address && /[a-z]/i.test(settings.address) ? settings.address : undefined
  const telephone = elCruce ? EL_CRUCE_PHONE : settings?.phone || branding?.contact_phone || branding?.whatsapp_number || undefined
  const email = elCruce ? EL_CRUCE_EMAIL : settings?.email || branding?.contact_email || undefined
  const elCruceMapUrl = 'https://www.google.com/maps/search/?api=1&query=Cafe%20Bar%20El%20Cruce%20Carr.%20Mazarron%209%2030120%20El%20Palmar%20Murcia'
  const sameAs = [
    social.facebook || branding?.facebook_url,
    social.instagram || branding?.instagram_url,
    social.website || (elCruce ? EL_CRUCE_PUBLIC_URL : publicUrl),
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'CafeOrCoffeeShop'],
    name: restaurantName,
    url: publicUrl,
    image: pageConfig.hero.image_url || branding?.hero_image_url || branding?.logo_url || context.tenant?.logo_url || undefined,
    logo: branding?.logo_url || context.tenant?.logo_url || undefined,
    description,
    telephone,
    email,
    servesCuisine: elCruce ? ['Tapas', 'Murciana', 'Espanola', 'Desayunos', 'Cafe', 'Bocadillos'] : undefined,
    priceRange: elCruce ? 'EUR 1-15' : undefined,
    paymentAccepted: elCruce ? 'Cash, Credit Card, Debit Card' : undefined,
    currenciesAccepted: elCruce ? 'EUR' : undefined,
    keywords: elCruce
      ? EL_CRUCE_KEYWORDS.join(', ')
      : undefined,
    slogan: elCruce ? 'Desayunos, tapas y raciones en El Palmar' : undefined,
    menu: `${publicUrl}/menu`,
    hasMenu: `${publicUrl}/menu`,
    acceptsReservations: Boolean(settings?.reservations_enabled),
    hasMap: elCruce ? elCruceMapUrl : undefined,
    areaServed: elCruce
      ? [
          { '@type': 'Place', name: 'El Palmar' },
          { '@type': 'Place', name: 'Murcia' },
          { '@type': 'Place', name: 'Hospital Virgen de la Arrixaca' },
          { '@type': 'Place', name: 'DCORASIA' },
        ]
      : undefined,
    potentialAction: elCruce
      ? [
          {
            '@type': 'ReserveAction',
            target: `${publicUrl}/reservas`,
            name: 'Reservar mesa en Cafe Bar El Cruce',
          },
          {
            '@type': 'ViewAction',
            target: `${publicUrl}/menu`,
            name: 'Ver carta de Cafe Bar El Cruce',
          },
        ]
      : undefined,
    subjectOf: elCruce
      ? EL_CRUCE_LOCAL_PAGES.map((page) => ({
          '@type': 'WebPage',
          name: page.h1,
          url: `${publicUrl}/${page.slug}`,
          description: page.description,
        }))
      : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality: elCruce ? 'El Palmar' : settings?.city || undefined,
      addressRegion: elCruce ? 'Murcia' : undefined,
      postalCode: elCruce ? '30120' : undefined,
      addressCountry: settings?.country || (context.tenant as any)?.country || 'ES',
    },
    sameAs: sameAs.length ? sameAs : undefined,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>
}): Promise<Metadata> {
  const { domain } = await params
  const context = await getTenantContext(domain)
  const restaurantName = getRestaurantDisplayName(context)
  const tenantSlug = context.tenant?.slug || domain
  const publicUrl = getTenantPublicUrl(context, domain)
  const description = getSeoDescription(context, restaurantName)
  const seoTitle = getSeoTitle(context, restaurantName)
  const tenantAppleIconUrl = `/${tenantSlug}/apple-touch-icon.png`
  const tenantIcon192Url = `/${tenantSlug}/icon-192.png`
  const tenantIcon512Url = `/${tenantSlug}/icon-512.png`
  const openGraphImageUrl =
    context.branding?.favicon_url ||
    context.branding?.logo_url ||
    context.tenant?.logo_url ||
    tenantIcon512Url

  return {
    title: {
      default: seoTitle,
      template: `%s | ${restaurantName}`,
    },
    description,
    keywords: isElCruce(context)
      ? EL_CRUCE_KEYWORDS
      : undefined,
    alternates: {
      canonical: publicUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    applicationName: restaurantName,
    manifest: `/${tenantSlug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: restaurantName,
    },
    other: {
      'apple-mobile-web-app-title': restaurantName,
      'mobile-web-app-capable': 'yes',
    },
    icons: {
      icon: [
        { url: tenantIcon192Url, sizes: '192x192', type: 'image/png' },
        { url: tenantIcon512Url, sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: tenantAppleIconUrl, sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      type: 'website',
      url: publicUrl,
      title: seoTitle,
      description,
      locale: 'es_ES',
      siteName: restaurantName,
      images: openGraphImageUrl ? [{ url: openGraphImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      images: openGraphImageUrl ? [openGraphImageUrl] : undefined,
    },
  }
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  try {
    const { domain: tenantId } = await params
    const context = await getTenantContext(tenantId)

    if (!context.tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🔍</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Restaurante No Encontrado
                </h1>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-700">
                  No encontramos un restaurante en esta dirección.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-slate-600 text-sm">
                  <strong>Podrías estar accediendo desde:</strong>
                </p>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>✓ Un dominio personalizado no configurado</li>
                  <li>✓ Un slug/subdominio incorrecto</li>
                  <li>✓ Un restaurante que fue eliminado</li>
                </ul>
              </div>

              <hr className="my-6" />

              <div className="space-y-3">
                <a
                  href="/"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Ir a Inicio
                </a>
                <a
                  href="mailto:soporte@restaurantsaas.com"
                  className="block w-full text-center bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Contactar Soporte
                </a>
              </div>

              <p className="text-xs text-slate-500 text-center mt-6">
                Si eres propietario del restaurante y ves este mensaje,{' '}
                <a href="mailto:soporte@restaurantsaas.com" className="text-blue-600 hover:underline">
                  contáctanos
                </a>
              </p>
            </div>
          </div>
    )
  }

  const branding = context.branding
  const access = getTenantAccessInfo(context.tenant)
  const publicUrl = getTenantPublicUrl(context, tenantId)
  const restaurantJsonLd = getRestaurantJsonLd(context, getRestaurantDisplayName(context), publicUrl)

  const fontFamily = branding?.font_family || 'system-ui, -apple-system, sans-serif'
  const logoUrl = branding?.logo_url || context.tenant?.logo_url || null
  const restaurantName = getRestaurantDisplayName(context)
  const pageConfig = getPageConfig((context.tenant as any)?.metadata?.page_config || branding?.page_config)
  const themeMode = pageConfig.appearance.theme_mode
  const isLightTheme = themeMode === 'light'
  const primaryColor = isLightTheme ? '#ff5a00' : '#D4AF37'
  const secondaryColor = isLightTheme ? '#ff1f1f' : '#D35A37'
  const accentColor = isLightTheme ? '#ff1f1f' : '#D4AF37'
  const buttonPrimaryColor = isLightTheme ? primaryColor : '#D35A37'
  const backgroundColor = isLightTheme ? '#ffffff' : '#0B0E14'
  const surfaceColor = isLightTheme ? '#ffffff' : '#1A1F2C'
  const textColor = isLightTheme ? '#07111f' : '#ffffff'
  const mutedTextColor = isLightTheme ? 'rgba(7, 17, 31, 0.72)' : '#8b97a8'

  return (
    <>
      <script
        id={`tenant-local-business-jsonld-${context.tenant.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
      />
      <style>{`
        :root {
          /* Multi-Tenant Branding with Eccofood Defaults */
          /* Store pages use tenant colors or Eccofood professional defaults */
          --primary-color: ${primaryColor};
          --secondary-color: ${secondaryColor};
          --accent-color: ${accentColor};
          --background-color: ${backgroundColor};
          --button-primary-color: ${buttonPrimaryColor};
          --button-secondary-color: ${isLightTheme ? '#fff3e8' : 'rgba(212, 175, 55, 0.12)'};
          --price-color: ${accentColor};
          --brand-surface-color: ${surfaceColor};
          --brand-text-color: ${textColor};
          --brand-muted-color: ${mutedTextColor};
          --font-family: ${fontFamily};

          /* Admin pages always use Eccofood brand (no tenant override) */
          --admin-primary: #0066FF;
          --admin-secondary: #10B981;
          --admin-accent: #F97316;
        }

        /* Ensure proper color contrast for accessibility */
        * {
          --tw-bg-opacity: 1;
          --tw-text-opacity: 1;
        }
      `}</style>
      <div className="min-h-full flex flex-col" style={{ backgroundColor }}>
        <TenantAccessGuard
          access={access}
          slug={context.tenant.slug}
          restaurantName={restaurantName}
        >
          {children}
        </TenantAccessGuard>
        <TenantPwaManifestLink tenantSlug={context.tenant.slug} restaurantName={restaurantName} />
        <StoreBrandingMemory appName={restaurantName} logoUrl={logoUrl} primaryColor={primaryColor} themeMode={themeMode} />
        <StoreNavigationLoader color={primaryColor} logoUrl={logoUrl} themeMode={themeMode} />
        <ClientToaster position="bottom-right" />
      </div>
    </>
    )
  } catch (error) {
    console.error('TenantLayout error:', error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Error al Cargar
            </h1>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            Hubo un problema al cargar el restaurante. Por favor intenta más tarde.
          </p>
          <a
            href="/"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Ir a Inicio
          </a>
        </div>
      </div>
    )
  }
}
