'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { POSTerminal } from '@/components/admin/POSTerminal';

export default function StaffPOSPage() {
  const params = useParams();
  const slug = params.domain as string;
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('CO');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveTenant() {
      const supabase = createClient();
      const { data } = await supabase
        .from('tenants')
        .select('id, country')
        .eq('slug', slug)
        .single();

      if (data) {
        setTenantId(data.id);
        setCountry(data.country || 'CO');
      }
      setLoading(false);
    }

    if (slug) resolveTenant();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Cargando TPV...</div>;
  if (!tenantId) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Restaurante no encontrado</div>;

  return <POSTerminal tenantId={tenantId} country={country} />;
}
