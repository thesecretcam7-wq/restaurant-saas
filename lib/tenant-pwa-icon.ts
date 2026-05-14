import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { getTenantContext } from '@/lib/tenant'

async function getImageBuffer(iconUrl: string | null | undefined) {
  if (iconUrl) {
    try {
      const response = await fetch(iconUrl, { cache: 'no-store' })
      if (response.ok) {
        return Buffer.from(await response.arrayBuffer())
      }
    } catch (error) {
      console.warn('Could not fetch tenant PWA icon', error)
    }
  }

  return readFile(join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png'))
}

export async function createTenantPwaIcon(domain: string, size: number) {
  const context = await getTenantContext(domain)
  const iconUrl =
    context.branding?.favicon_url ||
    context.branding?.logo_url ||
    context.tenant?.logo_url
  const input = await getImageBuffer(iconUrl)
  const logoSize = Math.max(1, Math.round(size * 0.82))
  const offset = Math.round((size - logoSize) / 2)
  const logo = await sharp(input)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 11, g: 10, b: 8, alpha: 1 },
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer()
}
