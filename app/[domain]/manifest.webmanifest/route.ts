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
  const icon192Url = isTenantHost ? '/icon-192.png' : `/${tenantSlug}/icon-192.png`
  const icon512Url = isTenantHost ? '/icon-512.png' : `/${tenantSlug}/icon-512.png`

  return NextResponse.json(
    {
      name: restaurantName,
      short_name: restaurantName,
      description:
        context.branding?.tagline ||
        context.branding?.description ||
        `Tienda online de ${restaurantName}`,
      start_url: appScope,
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
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}
