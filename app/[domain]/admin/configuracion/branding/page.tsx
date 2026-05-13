import { redirect } from 'next/navigation'

interface BrandingProps {
  params: Promise<{ domain: string }>
}

export default async function BrandingPage({ params }: BrandingProps) {
  const { domain } = await params
  redirect(`/${domain}/admin/configuracion/restaurante`)
}
