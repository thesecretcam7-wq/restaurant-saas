import { getTenantContext } from '@/lib/tenant'
import BottomNav from '@/components/store/BottomNav'

interface Props {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}

export default async function StoreLayout({ children, params }: Props) {
  const { domain: tenantId } = await params
  const { branding } = await getTenantContext(tenantId)

  return (
    <div className="pb-[72px]">
      {children}
      <BottomNav tenantId={tenantId} primaryColor={branding?.primary_color} />
    </div>
  )
}
