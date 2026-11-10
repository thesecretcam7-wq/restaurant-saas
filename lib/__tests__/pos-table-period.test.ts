import { describe, expect, it } from 'vitest';
import { partitionPOSTableOrders } from '../pos-table-period';

const order = (id: string, created_at: string, total = 10) => ({ id, created_at, total, table_number: 1 });

describe('partitionPOSTableOrders', () => {
  it('separates yesterday from today without changing or merging either account on the same table', () => {
    const old = order('old', '2026-11-09T14:47:51.923Z');
    const today = order('today', '2026-11-10T06:00:00Z', 6);
    const orders = [old, today];
    const original = structuredClone(orders);
    const result = partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-11-10T06:22:00Z') });
    expect(result.current).toEqual([today]);
    expect(result.previous).toEqual([old]);
    expect(result.previous[0]).toBe(old);
    expect(orders).toEqual(original);
  });

  it('keeps overnight accounts on their operational day until the exact closing boundary', () => {
    const orders = [order('evening', '2026-11-09T20:00:00Z'), order('overnight', '2026-11-10T02:00:00Z')];
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-11-10T03:59:59Z') }).current).toEqual(orders);
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-11-10T04:00:00Z') }).previous).toEqual(orders);
  });

  it('uses Colombia local time and includes the start boundary', () => {
    const orders = [order('before', '2026-11-10T09:59:59Z'), order('start', '2026-11-10T10:00:00Z')];
    const result = partitionPOSTableOrders(orders, { timeZone: 'America/Bogota', now: new Date('2026-11-10T11:00:00Z') });
    expect(result.current.map(o => o.id)).toEqual(['start']);
    expect(result.previous.map(o => o.id)).toEqual(['before']);
  });

  it('honors the configured overnight closing hour', () => {
    const orders = [order('late', '2026-11-10T04:00:00Z')];
    const operatingHours = { monday: { night: { open: '20:00', close: '06:00' } } };
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', operatingHours, now: new Date('2026-11-10T04:30:00Z') }).current).toEqual(orders);
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', operatingHours, now: new Date('2026-11-10T05:00:00Z') }).previous).toEqual(orders);
  });

  it('keeps unresolved accounts across the daylight saving change in Spain', () => {
    const orders = [order('late', '2026-10-24T23:30:00Z'), order('repeat-hour', '2026-10-25T01:30:00Z')];
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-10-25T03:59:00Z') }).current).toEqual(orders);
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-10-25T04:00:00Z') }).previous).toEqual(orders);
  });

  it('preserves invalid and future dated accounts for explicit review', () => {
    const orders = [order('invalid', 'bad'), order('future', '2026-11-11T04:00:00Z')];
    expect(partitionPOSTableOrders(orders, { timeZone: 'Europe/Madrid', now: new Date('2026-11-10T06:00:00Z') })).toEqual({ current: [], previous: orders });
  });
});
