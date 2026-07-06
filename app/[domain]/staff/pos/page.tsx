import { createClient } from '@/lib/supabase/server';
import { POSTerminal } from '@/components/admin/POSTerminal';
import { StaffPOSOfflineFallback } from './StaffPOSOfflineFallback';

interface StaffPOSPageProps {
  params: Promise<{ domain: string }>;
}

const STAFF_POS_BOOT_TIMEOUT_MS = 2500;

async function withSupabaseTimeout<T>(
  buildQuery: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await buildQuery(controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function StaffPOSPage({ params }: StaffPOSPageProps) {
  const { domain: slug } = await params;
  const supabase = await createClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const tenantResult: any = await withSupabaseTimeout(
    (signal) => (supabase
      .from('tenants')
      .select('id, country')
      .eq(isUUID ? 'id' : 'slug', slug)
      .single() as any).abortSignal(signal),
    STAFF_POS_BOOT_TIMEOUT_MS
  );
  const tenant = tenantResult?.data;

  if (!tenant) {
    return <StaffPOSOfflineFallback tenantSlug={slug} />;
  }

  const settingsResult: any = await withSupabaseTimeout(
    (signal) => (supabase
      .from('restaurant_settings')
      .select('country')
      .eq('tenant_id', tenant.id)
      .maybeSingle() as any).abortSignal(signal),
    STAFF_POS_BOOT_TIMEOUT_MS
  );
  const settings = settingsResult?.data;

  return <POSTerminal tenantId={tenant.id} tenantSlug={slug} country={settings?.country || tenant.country || 'CO'} />;
}
