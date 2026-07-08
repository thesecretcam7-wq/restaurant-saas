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
