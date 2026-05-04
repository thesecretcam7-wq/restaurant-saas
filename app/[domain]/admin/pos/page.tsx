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

  const { data: settings } = tenant
    ? await supabase
        .from('restaurant_settings')
        .select('country')
        .eq('tenant_id', tenant.id)
        .maybeSingle()
    : { data: null };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
        Error: Restaurante no encontrado
      </div>
    );
  }

  return (
    <div className="relative left-1/2 -m-4 h-[calc(100vh-3.5rem)] w-screen -translate-x-1/2 overflow-hidden sm:-m-6 md:h-screen md:w-[calc(100vw-16rem)] lg:-m-8">
      <POSTerminal tenantId={tenant.id} tenantSlug={slug} country={settings?.country || tenant.country || 'CO'} />
    </div>
  );
}
