'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StaffScheduler } from '@/components/admin/StaffScheduler';
import { UsersRound } from 'lucide-react';

const supabase = createClient();

export default function StaffPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTenantId() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('owner_id', session.user.id)
          .single();

        if (tenant) {
          setTenantId(tenant.id);
        }
      } catch (error) {
        console.error('Error getting tenant:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    getTenantId();
  }, [router]);

  if (loading) {
    return <div className="admin-empty">Cargando personal...</div>;
  }

  if (!tenantId) {
    return <div className="admin-empty">No se encontro el restaurante</div>;
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
