import { createServiceClient } from '@/lib/supabase/server';
import { ServiceDeliveryScreen } from '@/components/admin/ServiceDeliveryScreen';
import { getTenantContext } from '@/lib/tenant';
import { getPageConfig } from '@/lib/pageConfig';

interface StaffDeliveriesPageProps {
  params: Promise<{ domain: string }>;
}

export default async function StaffDeliveriesPage({ params }: StaffDeliveriesPageProps) {
  const { domain: slug } = await params;
  const supabase = createServiceClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, organization_name, slug, country')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single();

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-xl text-red-500">
        Restaurante no encontrado
      </div>
    );
  }

  const context = await getTenantContext(tenant.slug || slug);
  const branding = context?.branding;
  const pageConfig = getPageConfig((context?.tenant as any)?.metadata?.page_config || branding?.page_config);
  const isLightTheme = pageConfig.appearance.theme_mode === 'light';

  return (
    <ServiceDeliveryScreen
      tenantId={tenant.id}
      tenantSlug={tenant.slug || slug}
      theme={{
        isLightTheme,
        primaryColor: isLightTheme ? '#ff5a00' : '#D4AF37',
        accentColor: isLightTheme ? '#ff1f1f' : '#D35A37',
        backgroundColor: isLightTheme ? '#ffffff' : '#0B0E14',
        surfaceColor: isLightTheme ? '#ffffff' : '#1A1F2C',
        buttonPrimaryColor: isLightTheme ? '#ff5a00' : '#D35A37',
        textPrimaryColor: isLightTheme ? '#07111f' : '#ffffff',
        textSecondaryColor: isLightTheme ? 'rgba(7, 17, 31, 0.70)' : '#8b97a8',
        borderColor: isLightTheme ? 'rgba(7, 17, 31, 0.12)' : 'rgba(212, 175, 55, 0.18)',
      }}
    />
  );
}
