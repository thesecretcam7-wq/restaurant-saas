import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AndroidStartClient from './start-client'

interface AndroidStartPageProps {
  searchParams?: Promise<{ manual?: string }>
}

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.eccofoodapp\.com$/, '')
    .replace(/[^a-z0-9-]/g, '')
}

export default async function AndroidStartPage({ searchParams }: AndroidStartPageProps) {
  const query = await searchParams
  const savedSlug = cleanSlug((await cookies()).get('eccofood_android_tenant_slug')?.value || '')

  if (savedSlug && query?.manual !== '1') {
    redirect(`/${savedSlug}/acceso`)
  }

  return <AndroidStartClient savedSlug={savedSlug} />
}
