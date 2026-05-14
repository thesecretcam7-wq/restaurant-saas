import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { getTenantContext } from '@/lib/tenant'

const tenantLogoCandidates = ['logo-real.png', 'logo-cropped.png', 'logo.png', 'logo.svg']

async function readFirstExisting(paths: string[]) {
  for (const path of paths) {
    try {
      await access(path)
      return readFile(path)
    } catch {}
  }
  return null
}

async function getImageBuffer(iconUrl: string | null | undefined, tenantSlug: string) {
  if (iconUrl) {
    try {
      if (iconUrl.startsWith('/')) {
        const localPath = join(process.cwd(), 'public', iconUrl.replace(/^\/+/, ''))
        const localIcon = await readFirstExisting([localPath])
        if (localIcon) return localIcon
      } else {
        const response = await fetch(iconUrl, { cache: 'no-store' })
        if (response.ok) {
          return Buffer.from(await response.arrayBuffer())
        }
      }
    } catch (error) {
      console.warn('Could not fetch tenant PWA icon', error)
    }
  }

  const tenantIcon = await readFirstExisting(
    tenantLogoCandidates.map((fileName) =>
      join(process.cwd(), 'public', 'restaurants', tenantSlug, fileName)
    )
  )

  if (tenantIcon) return tenantIcon

  return readFile(join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png'))
}

export async function createTenantPwaIcon(domain: string, size: number) {
  const context = await getTenantContext(domain)
  const tenantSlug = context.tenant?.slug || domain
  const iconUrl =
    context.branding?.favicon_url ||
    context.branding?.logo_url ||
    context.tenant?.logo_url
  const input = await getImageBuffer(iconUrl, tenantSlug)
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
