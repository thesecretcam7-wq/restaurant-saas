import type { MetadataRoute } from 'next'
import { EL_CRUCE_LOCAL_PAGES, EL_CRUCE_PUBLIC_URL } from '@/lib/el-cruce-seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: `${EL_CRUCE_PUBLIC_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${EL_CRUCE_PUBLIC_URL}/menu`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${EL_CRUCE_PUBLIC_URL}/reservas`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...EL_CRUCE_LOCAL_PAGES.map((page) => ({
      url: `${EL_CRUCE_PUBLIC_URL}/${page.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ]
}
