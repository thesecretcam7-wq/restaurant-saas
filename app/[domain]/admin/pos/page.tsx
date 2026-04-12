'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { POSTerminal } from '@/components/admin/POSTerminal';

export default function POSPage() {
  const params = useParams();
  const slug = params.domain as string;
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('CO');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveTenantId() {
      try {
        const supabase = createClient();
        // Try by slug first
        const { data: bySlug } = await supabase
          .from('tenants')
          .select('id, country')
          .eq('slug', slug)
          .single();

        if (bySlug) {
          setTenantId(bySlug.id);
          setCountry(bySlug.country || 'CO');
          return;
        }

        // If not found, try as UUID
        const { data: byId } = await supabase
          .from('tenants')
          .select('id, country')
          .eq('id', slug)
          .single();

        if (byId) {
          setTenantId(byId.id);
          setCountry(byId.country || 'CO');
        }
      } catch (error) {
        console.error('Error resolving tenant:', error);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      resolveTenantId();
    }
  }, [slug]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Cargando TPV...</div>;
  }

  if (!tenantId) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Error: Restaurante no encontrado</div>;
  }

  return <POSTerminal tenantId={tenantId} country={country} />;
}
