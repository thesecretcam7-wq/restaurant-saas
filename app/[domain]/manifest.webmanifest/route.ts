import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'

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
  const isTenantHost =
    host &&
    !host.includes('localhost') &&
    !host.includes('127.0.0.1') &&
    (!host.includes(BASE_DOMAIN) || host.startsWith(`${tenantSlug}.`))
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
