import { getTenantIdFromSlug } from '@/lib/tenant';
import { PromotionsManager } from '@/components/admin/PromotionsManager';
import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice';

export default async function PromotionsPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenantId = await getTenantIdFromSlug(domain);

  if (!tenantId) {
    return <AdminConnectionNotice unavailable />;
  }

  return <PromotionsManager tenantId={tenantId} />;
}
