'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { InventoryManager } from '@/components/admin/InventoryManager';

export default function InventoryPage() {
  const { domain } = useParams() as { domain: string };
  const [tenantId, setTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain)
    const supabase = createClient()
    supabase
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', domain)
      .single()
      .then(({ data }) => {
        if (data) setTenantId(data.id)
        setLoading(false)
      })
  }, [domain]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>;
  if (!tenantId) return <div className="flex items-center justify-center h-64 text-gray-400">Error al cargar inventario</div>;

  return <InventoryManager tenantId={tenantId} />;
}
