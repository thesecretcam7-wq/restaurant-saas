export type OrderNumberSource = {
  display_number?: number | string | null;
  order_number?: string | null;
  id?: string | null;
};

export function formatStaffOrderNumber(order?: OrderNumberSource | null) {
  const displayNumber = Number(order?.display_number);
  if (Number.isFinite(displayNumber) && displayNumber > 0) {
    return `#${String(Math.trunc(displayNumber)).padStart(3, '0')}`;
  }

  const rawOrderNumber = String(order?.order_number || '').trim();
  if (rawOrderNumber) {
    const withoutPrefix = rawOrderNumber.replace(/^ORD-/i, '');
    if (/^\d+$/.test(withoutPrefix) && withoutPrefix.length > 4) {
      return `#${withoutPrefix.slice(-4)}`;
    }
    return rawOrderNumber.startsWith('#') ? rawOrderNumber : `#${rawOrderNumber}`;
  }

  if (order?.id) return `#${order.id.slice(0, 8)}`;

  return '#---';
}
