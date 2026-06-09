import { createServiceClient } from '@/lib/supabase/server';
import { ServiceDeliveryScreen } from '@/components/admin/ServiceDeliveryScreen';

interface StaffDeliveriesPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StaffDeliveriesPage({ params }: StaffDeliveriesPageProps) {
  const { domain: slug } = await params;
  const supabase = createServiceClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single();

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-xl text-red-500">
        Restaurante no encontrado
      </div>
    );
  }

  return <ServiceDeliveryScreen tenantId={tenant.id} />;
}
