import { redirect } from 'next/navigation'

interface PersonalizacionProps {
  params: Promise<{ domain: string }>
}

export default async function PersonalizacionPage({ params }: PersonalizacionProps) {
  const { domain } = await params
  redirect(`/${domain}/admin/configuracion/restaurante`)
}
