import { getTenantIdFromSlug } from '@/lib/tenant'
import { AIInsights } from '@/components/admin/AIInsights'

interface Props {
  params: Promise<{ domain: string }>
}

export default async function AIInsightsPage({ params }: Props) {
  const { domain: slug } = await params
  const tenantId = await getTenantIdFromSlug(slug)

  if (!tenantId) {
    return <div className="admin-empty">Restaurante no encontrado</div>
  }

  return <AIInsights tenantId={tenantId} />
}
