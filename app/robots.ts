import type { MetadataRoute } from 'next'
import { EL_CRUCE_PUBLIC_URL } from '@/lib/el-cruce-seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/*/admin/',
        '/*/kitchen/',
        '/*/cocina/',
        '/*/staff/',
        '/*/acceso/',
        '/*/pos-display/',
      ],
    },
    sitemap: `${EL_CRUCE_PUBLIC_URL}/sitemap.xml`,
  }
}
