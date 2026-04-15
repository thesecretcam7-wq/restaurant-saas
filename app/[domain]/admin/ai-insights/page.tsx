'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AIInsights } from '@/components/admin/AIInsights';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AIInsightsPage() {
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
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!tenantId) {
    return <div className="flex items-center justify-center h-screen">Error: No tenant found</div>;
  }

  return <AIInsights tenantId={tenantId} />;
}
