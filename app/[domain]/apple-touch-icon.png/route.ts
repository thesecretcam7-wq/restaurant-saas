import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { getTenantContext } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getImageBuffer(iconUrl: string | null | undefined) {
  if (iconUrl) {
    try {
      const response = await fetch(iconUrl, { cache: 'no-store' })
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer())
      }
    } catch (error) {
      console.warn('Could not fetch tenant icon for apple-touch-icon', error)
    }
  }

  return readFile(join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png'))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { domain } = await params
  const context = await getTenantContext(domain)
  const iconUrl =
    context.branding?.favicon_url ||
    context.branding?.logo_url ||
    context.tenant?.logo_url

  const input = await getImageBuffer(iconUrl)
  const logo = await sharp(input)
    .resize(164, 164, {
      fit: 'cover',
      position: 'center',
    })
    .png()
    .toBuffer()
  const png = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, left: 8, top: 8 }])
    .png()
    .toBuffer()

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
