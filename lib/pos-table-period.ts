import { getRestaurantBusinessPeriod } from './restaurant-time';

// Keep unresolved accounts visible for review without occupying today's tables.
export function partitionPOSTableOrders<T extends { created_at: string }>(
  orders: T[],
  options: Parameters<typeof getRestaurantBusinessPeriod>[0],
): { current: T[]; previous: T[] } {
  const period = getRestaurantBusinessPeriod(options);
  const start = Date.parse(period.periodStart);
  const end = Date.parse(period.periodEnd);
  const current: T[] = [];
  const previous: T[] = [];
  for (const order of orders) {
    const created = Date.parse(order.created_at);
    // Invalid or future dates also require explicit review rather than merging.
    (created >= start && created < end ? current : previous).push(order);
  }
  return { current, previous };
}
