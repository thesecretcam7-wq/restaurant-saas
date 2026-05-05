import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function CocinaPage({ params }: Props) {
  const { domain } = await params
  redirect(`/${domain}/acceso/login/cocinero`)
}
