import { createServiceClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

interface KitchenLayoutProps {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: KitchenLayoutProps): Promise<Metadata> {
  const { domain: slug } = await params;
  const supabase = createServiceClient();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('organization_name, slug')
    .eq(isUUID ? 'id' : 'slug', slug)
    .single();

  const tenantSlug = tenant?.slug || slug;
  const restaurantName = tenant?.organization_name || 'Restaurante';

  return {
    title: `Camarero | ${restaurantName}`,
    applicationName: `${restaurantName} Camarero`,
    manifest: `/${tenantSlug}/manifest.webmanifest?screen=waiter`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: `${restaurantName} Camarero`,
    },
    other: {
      'apple-mobile-web-app-title': `${restaurantName} Camarero`,
      'mobile-web-app-capable': 'yes',
    },
  };
}

export default function KitchenLayout({ children }: KitchenLayoutProps) {
  return children;
}
