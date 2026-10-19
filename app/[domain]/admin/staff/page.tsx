import { getTenantIdFromSlug } from '@/lib/tenant';
import { StaffScheduler } from '@/components/admin/StaffScheduler';
import { UsersRound } from 'lucide-react';
import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice';

export default async function StaffPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const tenantId = await getTenantIdFromSlug(domain);

  if (!tenantId) {
    return <AdminConnectionNotice unavailable />;
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Equipo</p>
          <h1 className="admin-title">Personal</h1>
          <p className="admin-subtitle">Empleados, roles, tarifas y turnos de trabajo.</p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-xl bg-[#15130f] text-white sm:flex">
          <UsersRound className="size-5" />
        </span>
      </div>
      <StaffScheduler tenantId={tenantId} />
    </div>
  );
}
