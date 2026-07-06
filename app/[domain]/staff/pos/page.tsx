import { createClient } from '@/lib/supabase/server';
import { POSTerminal } from '@/components/admin/POSTerminal';
import { StaffPOSOfflineFallback } from './StaffPOSOfflineFallback';

interface StaffPOSPageProps {
  params: Promise<{ domain: string }>;
}

const STAFF_POS_BOOT_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export default async function StaffPOSPage({ params }: StaffPOSPageProps) {
  const { domain: slug } = await params;
  const supabase = await createClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const tenantResult = await withTimeout(
    supabase
      .from('tenants')
      .select('id, country')
      .eq(isUUID ? 'id' : 'slug', slug)
      .single(),
    STAFF_POS_BOOT_TIMEOUT_MS
  );
  const tenant = tenantResult?.data;

  if (!tenant) {
    return <StaffPOSOfflineFallback tenantSlug={slug} />;
  }

  const settingsResult = await withTimeout(
    supabase
      .from('restaurant_settings')
      .select('country')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
    STAFF_POS_BOOT_TIMEOUT_MS
  );
  const settings = settingsResult?.data;

  return <POSTerminal tenantId={tenant.id} tenantSlug={slug} country={settings?.country || tenant.country || 'CO'} />;
}
