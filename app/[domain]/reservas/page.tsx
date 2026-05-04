import { redirect } from 'next/navigation'

interface ReservasAliasPageProps {
  params: Promise<{ domain: string }>
}

export default async function ReservasAliasPage({ params }: ReservasAliasPageProps) {
  const { domain } = await params
  redirect(`/${domain}/agendar-reserva`)
}
