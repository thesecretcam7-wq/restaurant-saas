const CANCELLED_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado']);

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export function isCancelledCashClosingOrder(order: any) {
  return CANCELLED_ORDER_STATUSES.has(normalizeStatus(order?.status));
}

export function isPaidCashClosingOrder(order: any) {
  return normalizeStatus(order?.payment_status) === 'paid';
}

export function isCountableCashClosingOrder(order: any) {
  return !isCancelledCashClosingOrder(order) && isPaidCashClosingOrder(order);
}

export function isPendingPreviousCashClosingOrder(
  order: any,
  currentPeriodStart: Date,
  closedOrderIds: Set<string>
) {
  if (isCancelledCashClosingOrder(order)) return false;
  if (!isPaidCashClosingOrder(order)) return false;
  if (closedOrderIds.has(order.id)) return false;
  return new Date(order.created_at) < currentPeriodStart;
}

export function getOldestPendingCashClosingPeriod<T extends { created_at?: string | null }>(
  orders: T[],
  currentPeriodStart: Date,
  currentPeriodEnd: Date
) {
  const periodDurationMs = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
  const safePeriodDurationMs = Number.isFinite(periodDurationMs) && periodDurationMs > 0
    ? periodDurationMs
    : 24 * 60 * 60 * 1000;

  const sortedOrders = [...orders].sort((left, right) => {
    return new Date(left.created_at || '').getTime() - new Date(right.created_at || '').getTime();
  });
  const firstPendingOrderDate = new Date(sortedOrders[0]?.created_at || '');
  if (Number.isNaN(firstPendingOrderDate.getTime())) return null;

  const periodsBack = Math.max(
    1,
    Math.ceil((currentPeriodStart.getTime() - firstPendingOrderDate.getTime()) / safePeriodDurationMs)
  );
  const periodStart = new Date(currentPeriodStart.getTime() - safePeriodDurationMs * periodsBack);
  const periodEnd = new Date(periodStart.getTime() + safePeriodDurationMs);
  const periodOrders = sortedOrders.filter((order) => {
    const orderDate = new Date(order.created_at || '');
    if (Number.isNaN(orderDate.getTime())) return false;
    return orderDate >= periodStart && orderDate < periodEnd;
  });

  if (periodOrders.length === 0) return null;
  return { periodStart, periodEnd, periodOrders };
}
