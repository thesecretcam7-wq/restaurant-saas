import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
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
  const primaryColor = context.branding?.primary_color || '#F97316'
  const backgroundColor = context.branding?.background_color || '#FFFFFF'
  const iconUrl =
    context.branding?.favicon_url ||
    context.branding?.logo_url ||
    context.tenant?.logo_url ||
    '/icons/icon-512.png'

  return NextResponse.json(
    {
      name: restaurantName,
      short_name: restaurantName,
      description:
        context.branding?.tagline ||
        context.branding?.description ||
        `Tienda online de ${restaurantName}`,
      start_url: `/${tenantSlug}`,
      scope: `/${tenantSlug}/`,
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: primaryColor,
      orientation: 'portrait-primary',
      icons: [
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
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
