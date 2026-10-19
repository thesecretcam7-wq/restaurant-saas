import { getTenantIdFromSlug } from '@/lib/tenant';
import { InvoicesManager } from '@/components/admin/InvoicesManager';
import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice';

export default async function InvoicesPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenantId = await getTenantIdFromSlug(domain);

  if (!tenantId) {
    return <AdminConnectionNotice unavailable />;
  }

  return <InvoicesManager tenantId={tenantId} />;
}
