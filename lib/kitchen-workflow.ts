import { addRestaurantLocalDays, getRestaurantBusinessPeriod, getRestaurantLocalDateKey, getRestaurantLocalDateStartUtc, getRestaurantTimeZone } from './restaurant-time';

export function kitchenBusinessPeriod(settings: { operating_hours?: unknown; timezone?: string | null; country?: string | null }, date?: string | null) {
  const timeZone = getRestaurantTimeZone({ timezone: settings.timezone, settingsCountry: settings.country });
  let now: Date | undefined;
  if (date) {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(date) ? getRestaurantLocalDateStartUtc(date, timeZone) : null;
    const end = start && getRestaurantLocalDateStartUtc(addRestaurantLocalDays(date, 1), timeZone);
    if (!start || !end || getRestaurantLocalDateKey(start, timeZone) !== date) throw new Error('Fecha de cocina inválida');
    now = new Date(end.getTime() - 1);
  }
  return getRestaurantBusinessPeriod({ timeZone, operatingHours: settings.operating_hours, now });
}

export async function fetchKitchenItems<T extends { id: string }>(tenantId: string, date: string, signal: AbortSignal): Promise<{ enabled: boolean; items: T[] }> {
  const items = new Map<string, T>();
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const params = new URLSearchParams({ tenantId, status: 'pending,confirmed,preparing,ready', requiresKitchen: 'true', limit: String(pageSize), offset: String(offset) });
    if (date) params.set('date', date); else params.set('today', '1');
    const response = await fetch(`/api/order-items?${params}`, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('No se pudo cargar la cocina');
    if (response.headers.get('x-kds-enabled') === 'false') return { enabled: false, items: [] };
    const page: T[] = await response.json();
    page.forEach(item => items.set(item.id, item));
    if (page.length < pageSize) return { enabled: true, items: [...items.values()] };
  }
}
