import { EccofoodLanding } from './EccofoodLanding'
import TenantHomePage from './[domain]/page'
import { headers } from 'next/headers'
import { getTenantByDomain } from '@/lib/tenant'
import { PwaStaffResume } from '@/components/PwaStaffResume'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const host = (await headers()).get('host') || ''
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'eccofoodapp.com'

  if (host && !host.includes(baseDomain) && !host.includes('localhost')) {
    const tenant = await getTenantByDomain(host)
    if (tenant?.slug) {
      return (
        <>
          <PwaStaffResume />
          <TenantHomePage params={Promise.resolve({ domain: tenant.slug })} />
        </>
      )
    }
  }

  return (
    <>
      <PwaStaffResume />
      <EccofoodLanding />
    </>
  )
}
