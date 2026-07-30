import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/tenant'
import {
  EL_CRUCE_ADDRESS,
  EL_CRUCE_EMAIL,
  EL_CRUCE_LOCAL_PAGES,
  EL_CRUCE_PHONE,
  EL_CRUCE_PUBLIC_URL,
  getElCruceLocalPage,
  isElCruceIdentity,
} from '@/lib/el-cruce-seo'

export const dynamic = 'force-dynamic'

type LocalSeoPageProps = {
  params: Promise<{ domain: string; localSeoSlug: string }>
}

export async function generateMetadata({ params }: LocalSeoPageProps): Promise<Metadata> {
  const { domain, localSeoSlug } = await params
  if (localSeoSlug === 'menu-del-dia-el-palmar') {
    return {
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const context = await getTenantContext(domain)
  const page = getElCruceLocalPage(localSeoSlug)

  if (!page || !isElCruceIdentity(context.tenant?.slug, context.tenant?.organization_name)) {
    return {}
  }

  const canonical = `${EL_CRUCE_PUBLIC_URL}/${page.slug}`

  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      siteName: 'Cafe Bar El Cruce',
      url: canonical,
      title: page.title,
      description: page.description,
    },
    twitter: {
      card: 'summary',
      title: page.title,
      description: page.description,
    },
  }
}

export async function generateStaticParams() {
  return EL_CRUCE_LOCAL_PAGES.map((page) => ({
    domain: 'cafebarelcruce',
    localSeoSlug: page.slug,
  }))
}

export default async function LocalSeoPage({ params }: LocalSeoPageProps) {
  const { domain, localSeoSlug } = await params
  if (localSeoSlug === 'menu-del-dia-el-palmar') {
    redirect(`/${domain}/menu`)
  }

  const context = await getTenantContext(domain)
  const page = getElCruceLocalPage(localSeoSlug)

  if (!page || !isElCruceIdentity(context.tenant?.slug, context.tenant?.organization_name)) {
    notFound()
  }

  const menuHref = page.path
  const reservationHref = '/reservas'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    url: `${EL_CRUCE_PUBLIC_URL}/${page.slug}`,
    description: page.description,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Cafe Bar El Cruce',
      url: EL_CRUCE_PUBLIC_URL,
    },
    about: {
      '@type': ['Restaurant', 'CafeOrCoffeeShop'],
      name: 'Cafe Bar El Cruce',
      telephone: EL_CRUCE_PHONE,
      email: EL_CRUCE_EMAIL,
      address: {
        '@type': 'PostalAddress',
        streetAddress: EL_CRUCE_ADDRESS,
        addressLocality: 'El Palmar',
        addressRegion: 'Murcia',
        postalCode: '30120',
        addressCountry: 'ES',
      },
    },
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] text-[#1d1b16]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <Link href="/" className="text-sm font-black uppercase tracking-[0.2em] text-[#b45309]">
          Cafe Bar El Cruce
        </Link>
        <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-[#111827] sm:text-6xl">
          {page.h1}
        </h1>
        <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-[#4b5563]">
          {page.intro}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {page.highlights.map((highlight) => (
            <div key={highlight} className="rounded-lg border border-[#f59e0b]/25 bg-white px-4 py-3 text-base font-black text-[#111827] shadow-sm">
              {highlight}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">Cafe Bar El Cruce en El Palmar</h2>
          <p className="mt-3 text-base font-semibold leading-7 text-[#4b5563]">
            Estamos en {EL_CRUCE_ADDRESS}. Puedes consultar la carta online, llamar al {EL_CRUCE_PHONE}
            {' '}o reservar mesa desde la web oficial.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={menuHref} className="rounded-lg bg-[#ff5a00] px-5 py-3 text-sm font-black uppercase text-white">
              {page.cta}
            </Link>
            <Link href={reservationHref} className="rounded-lg border border-[#ff5a00]/35 bg-[#fff7ed] px-5 py-3 text-sm font-black uppercase text-[#9a3412]">
              Reservar mesa
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
