import { createClient } from '@/lib/supabase/server';
import { POSTerminal } from '@/components/admin/POSTerminal';

interface StaffPOSPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StaffPOSPage({ params }: StaffPOSPageProps) {
  const { domain: slug } = await params;
  const supabase = await createClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, country')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single();

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-600">
        Restaurante no encontrado
      </div>
    );
  }

  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('country')
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  return <POSTerminal tenantId={tenant.id} tenantSlug={slug} country={settings?.country || tenant.country || 'CO'} />;
}
