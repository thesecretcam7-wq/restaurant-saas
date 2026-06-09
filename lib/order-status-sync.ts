type OrderItemStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

const STATUS_PRIORITY: Record<Exclude<OrderItemStatus, 'cancelled'>, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
};

export function getAggregateOrderStatus(statuses: string[]) {
  const activeStatuses = statuses.filter(
    (status): status is Exclude<OrderItemStatus, 'cancelled'> =>
      status !== 'cancelled' && Object.prototype.hasOwnProperty.call(STATUS_PRIORITY, status)
  );

  if (activeStatuses.length === 0) return null;

  return activeStatuses.reduce((minStatus, status) =>
    STATUS_PRIORITY[status] < STATUS_PRIORITY[minStatus] ? status : minStatus
  , activeStatuses[0]);
}

export async function syncOrderStatusFromItems(
  supabase: any,
  {
    orderId,
    tenantId,
  }: {
    orderId: string;
    tenantId: string;
  }
) {
  const { data: siblings, error: siblingsError } = await supabase
    .from('order_items')
    .select('status')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled');

  if (siblingsError) {
    throw siblingsError;
  }

  const nextStatus = getAggregateOrderStatus((siblings || []).map((item: { status: string }) => item.status));
  if (!nextStatus) return null;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled');

  if (updateError) {
    throw updateError;
  }

  return nextStatus;
}

export async function syncOrderDeliveredIfAllItemsDelivered(
  supabase: any,
  {
    orderId,
    tenantId,
  }: {
    orderId: string;
    tenantId: string;
  }
) {
  const { data: siblings, error: siblingsError } = await supabase
    .from('order_items')
    .select('status')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled');

  if (siblingsError) {
    throw siblingsError;
  }

  const nextStatus = getAggregateOrderStatus((siblings || []).map((item: { status: string }) => item.status));
  if (nextStatus !== 'delivered') return null;

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled');

  if (updateError) {
    throw updateError;
  }

  return 'delivered';
}
