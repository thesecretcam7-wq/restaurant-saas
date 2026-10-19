import { getTenantIdFromSlug } from '@/lib/tenant';
import { AnalyticsEngine } from '@/components/admin/AnalyticsEngine';
import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice';

export default async function AnalyticsPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenantId = await getTenantIdFromSlug(domain);

  if (!tenantId) {
    return <AdminConnectionNotice unavailable />;
  }

  return <AnalyticsEngine tenantId={tenantId} />;
}
