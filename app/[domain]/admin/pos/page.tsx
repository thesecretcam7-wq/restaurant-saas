import { createClient } from '@/lib/supabase/server';
import { POSTerminal } from '@/components/admin/POSTerminal';

interface POSPageProps {
  params: Promise<{ domain: string }>;
}

export default async function POSPage({ params }: POSPageProps) {
  const { domain: slug } = await params;
  const supabase = await createClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let tenant = null;
  if (isUUID) {
    const { data } = await supabase
      .from('tenants')
      .select('id, country')
      .eq('id', slug)
      .single();
    tenant = data;
  } else {
    const { data } = await supabase
      .from('tenants')
      .select('id, country')
      .eq('slug', slug)
      .single();
    tenant = data;
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
        Error: Restaurante no encontrado
      </div>
    );
  }

  return <POSTerminal tenantId={tenant.id} country={tenant.country || 'CO'} />;
}
