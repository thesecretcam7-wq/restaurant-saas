import { redirect } from 'next/navigation'

type RemovedMenuDayPageProps = {
  params: Promise<{ domain: string }>
}

export default async function RemovedMenuDayPage({ params }: RemovedMenuDayPageProps) {
  const { domain } = await params
  redirect(`/${domain}/menu`)
}
