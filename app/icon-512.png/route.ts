import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getTenantByDomain } from '@/lib/tenant'
import { createTenantPwaIcon } from '@/lib/tenant-pwa-icon'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() || ''
  const tenant = host ? await getTenantByDomain(host) : null
  const png = tenant?.slug
    ? await createTenantPwaIcon(tenant.slug, 512)
    : await readFile(join(process.cwd(), 'public', 'icons', 'icon-512.png'))

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': tenant?.slug ? 'no-store, max-age=0' : 'public, max-age=86400',
    },
  })
}
