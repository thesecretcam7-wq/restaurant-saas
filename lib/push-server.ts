import webpush, { type PushSubscription } from 'web-push';

type SupabaseClientLike = {
  from: (table: string) => any;
};

type ServiceReadyPushInput = {
  tenantId: string;
  itemIds: string[];
};

type PushSubscriptionRow = {
  id: string;
  subscription: PushSubscription;
};

type ReadyItemRow = {
  id: string;
  name: string | null;
  quantity: number | null;
  orders?: {
    display_number?: number | null;
    order_number?: string | null;
    table_number?: number | null;
    customer_name?: string | null;
    delivery_type?: string | null;
  } | null;
};

let webPushConfigured = false;

export function getWebPushPublicKey() {
  return (process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || process.env.WEB_PUSH_PUBLIC_KEY || '').trim();
}

export function isWebPushConfigured() {
  return Boolean(getWebPushPublicKey() && process.env.WEB_PUSH_PRIVATE_KEY?.trim());
}

function ensureWebPushConfigured() {
  if (webPushConfigured) return true;

  const publicKey = getWebPushPublicKey();
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT?.trim() || 'mailto:soporte@eccofoodapp.com',
    publicKey,
    privateKey
  );
  webPushConfigured = true;
  return true;
}

function compactOrderNumber(orderNumber?: string | null, displayNumber?: number | null) {
  if (displayNumber) return `#${displayNumber}`;
  if (!orderNumber) return '';
  const clean = orderNumber.replace(/^ORD-?/i, '');
  return clean ? `#${clean.slice(-4)}` : '';
}

function buildReadyBody(items: ReadyItemRow[]) {
  const firstOrder = items[0]?.orders;
  const quantity = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
  const itemWord = quantity === 1 ? 'producto' : 'productos';

  if (firstOrder?.table_number) {
    return `Mesa ${firstOrder.table_number} - ${quantity} ${itemWord} listos`;
  }

  if (firstOrder?.customer_name?.toLowerCase().startsWith('mesa ')) {
    return `${firstOrder.customer_name} - ${quantity} ${itemWord} listos`;
  }

  const orderNumber = compactOrderNumber(firstOrder?.order_number, firstOrder?.display_number);
  if (orderNumber) {
    return `Pedido ${orderNumber} - ${quantity} ${itemWord} listos`;
  }

  return `${quantity} ${itemWord} listos para entregar`;
}

export async function sendServiceReadyPushNotifications(
  supabase: SupabaseClientLike,
  { tenantId, itemIds }: ServiceReadyPushInput
) {
  if (!ensureWebPushConfigured() || itemIds.length === 0) return;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug, organization_name')
    .eq('id', tenantId)
    .maybeSingle();

  const tenantSlug = tenant?.slug;
  if (!tenantSlug) return;

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      id,
      name,
      quantity,
      orders (
        display_number,
        order_number,
        table_number,
        customer_name,
        delivery_type
      )
    `)
    .eq('tenant_id', tenantId)
    .in('id', itemIds);

  if (itemsError || !items?.length) {
    if (itemsError) console.error('[push] ready items query error:', itemsError.message);
    return;
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from('staff_push_subscriptions')
    .select('id, subscription')
    .eq('tenant_id', tenantId)
    .eq('role', 'camarero')
    .is('disabled_at', null);

  if (subscriptionsError) {
    console.error('[push] subscriptions query error:', subscriptionsError.message);
    return;
  }

  const activeSubscriptions = (subscriptions || []) as PushSubscriptionRow[];
  if (activeSubscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: `${tenant.organization_name || 'Eccofood'}: pedido listo`,
    body: buildReadyBody(items as ReadyItemRow[]),
    url: `/${tenantSlug}/staff/entregas`,
    tag: `service-ready:${tenantId}:${itemIds.sort().join(',')}`,
    icon: `/${tenantSlug}/icon-192.png`,
    badge: `/${tenantSlug}/icon-192.png`,
  });

  await Promise.all(
    activeSubscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload, {
          TTL: 300,
          urgency: 'high',
        });
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status);
        const update: Record<string, any> = {
          last_error: error instanceof Error ? error.message : 'Push failed',
          updated_at: new Date().toISOString(),
        };
        if (statusCode === 404 || statusCode === 410) {
          update.disabled_at = new Date().toISOString();
        }
        await supabase
          .from('staff_push_subscriptions')
          .update(update)
          .eq('id', row.id);
      }
    })
  );
}
