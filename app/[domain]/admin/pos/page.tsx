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
        // Try by slug first (without .single() to avoid 406 errors)
        const { data: bySlug, error: slugError } = await supabase
          .from('tenants')
          .select('id, country')
          .eq('slug', slug);

        if (bySlug && bySlug.length > 0) {
          setTenantId(bySlug[0].id);
          setCountry(bySlug[0].country || 'CO');
          return;
        }

        // If not found, try as UUID
        const { data: byId, error: idError } = await supabase
          .from('tenants')
          .select('id, country')
          .eq('id', slug);

        if (byId && byId.length > 0) {
          setTenantId(byId[0].id);
          setCountry(byId[0].country || 'CO');
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
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">Cargando TPV...</div>;
  }

  if (!tenantId) {
    return <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">Error: Restaurante no encontrado</div>;
  }

  return <POSTerminal tenantId={tenantId} country={country} />;
}
