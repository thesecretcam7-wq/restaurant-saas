import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'
const PLATFORM_HOSTS = new Set([
  'eccofoodapp.com',
  'www.eccofoodapp.com',
  'eccofood.vercel.app',
  'restaurant-saas.vercel.app',
])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params
  const context = await getTenantContext(domain)
  const restaurantName =
    context.branding?.app_name ||
    context.tenant?.organization_name ||
    context.tenant?.slug ||
    'Restaurante'
  const tenantSlug = context.tenant?.slug || domain
  const primaryColor = '#D9A441'
  const backgroundColor = '#0B0906'
  const host = request.headers.get('host') || ''
  const cleanHost = host.split(':')[0]?.toLowerCase() || ''
  const isTenantHost =
    cleanHost &&
    !cleanHost.includes('localhost') &&
    !cleanHost.includes('127.0.0.1') &&
    !cleanHost.endsWith('.vercel.app') &&
    !PLATFORM_HOSTS.has(cleanHost) &&
    (!cleanHost.includes(BASE_DOMAIN) || cleanHost.startsWith(`${tenantSlug}.`))
  const appScope = isTenantHost ? '/' : `/${tenantSlug}/`
  const screen = new URL(request.url).searchParams.get('screen') || 'store'
  const operationalScreens: Record<string, { label: string; startPath: string; description: string }> = {
    waiter: {
      label: 'Camarero',
      startPath: 'kitchen',
      description: `Comandero de sala de ${restaurantName}`,
    },
    deliveries: {
      label: 'Entregas',
      startPath: 'staff/entregas',
      description: `Entregas pendientes de ${restaurantName}`,
    },
    waiterAccess: {
      label: 'Camarero',
      startPath: 'acceso/apk/camarero',
      description: `Acceso de camareros de ${restaurantName}`,
    },
  }
  const operationalScreen = operationalScreens[screen]
  const startUrl = operationalScreen ? `${appScope}${operationalScreen.startPath}` : appScope
  const appLabel = operationalScreen ? `${restaurantName} ${operationalScreen.label}` : restaurantName
  const icon192Url = isTenantHost ? '/icon-192.png' : `/${tenantSlug}/icon-192.png`
  const icon512Url = isTenantHost ? '/icon-512.png' : `/${tenantSlug}/icon-512.png`

  return NextResponse.json(
    {
      id: operationalScreen ? `${appScope}${screen}` : appScope,
      name: appLabel,
      short_name: operationalScreen?.label || restaurantName,
      description:
        operationalScreen?.description ||
        context.branding?.tagline ||
        context.branding?.description ||
        `Tienda online de ${restaurantName}`,
      start_url: startUrl,
      scope: appScope,
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: primaryColor,
      orientation: 'portrait-primary',
      lang: 'es',
      dir: 'ltr',
      icons: [
        {
          src: icon192Url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: icon512Url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['food', 'shopping'],
      prefer_related_applications: false,
      shortcuts: operationalScreen
        ? [
            {
              name: 'Comandero',
              short_name: 'Comandero',
              url: `${appScope}kitchen`,
              icons: [{ src: icon192Url, sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Entregas',
              short_name: 'Entregas',
              url: `${appScope}staff/entregas`,
              icons: [{ src: icon192Url, sizes: '192x192', type: 'image/png' }],
            },
          ]
        : undefined,
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}
