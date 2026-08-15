import { describe, expect, it } from 'vitest';
import {
  getOldestPendingCashClosingPeriod,
  isPendingPreviousCashClosingOrder,
} from '../cash-closing-filters';

describe('isPendingPreviousCashClosingOrder', () => {
  const currentPeriodStart = new Date('2026-07-07T03:00:00.000Z');
  const closedOrderIds = new Set<string>();

  it('excludes paid orders created after the current period starts', () => {
    expect(isPendingPreviousCashClosingOrder({
      id: 'after-cutoff',
      created_at: '2026-07-07T03:56:22.000Z',
      payment_status: 'paid',
      status: 'completed',
    }, currentPeriodStart, closedOrderIds)).toBe(false);
  });

  it('includes paid open orders before the current period starts', () => {
    expect(isPendingPreviousCashClosingOrder({
      id: 'before-cutoff',
      created_at: '2026-07-07T02:59:59.000Z',
      payment_status: 'paid',
      status: 'completed',
    }, currentPeriodStart, closedOrderIds)).toBe(true);
  });

  it('excludes orders already attached to a cash closing', () => {
    expect(isPendingPreviousCashClosingOrder({
      id: 'closed-order',
      created_at: '2026-07-07T02:30:00.000Z',
      payment_status: 'paid',
      status: 'completed',
    }, currentPeriodStart, new Set(['closed-order']))).toBe(false);
  });

  it('selects the oldest still-open business period when the missed closing is older than yesterday', () => {
    const result = getOldestPendingCashClosingPeriod([
      { id: 'wednesday-order', created_at: '2026-08-12T21:00:00.000Z' },
      { id: 'tuesday-order', created_at: '2026-08-11T21:00:00.000Z' },
      { id: 'friday-order', created_at: '2026-08-14T21:00:00.000Z' },
    ], new Date('2026-08-15T10:00:00.000Z'), new Date('2026-08-16T10:00:00.000Z'));

    expect(result?.periodStart.toISOString()).toBe('2026-08-11T10:00:00.000Z');
    expect(result?.periodEnd.toISOString()).toBe('2026-08-12T10:00:00.000Z');
    expect(result?.periodOrders.map((order) => order.id)).toEqual(['tuesday-order']);
  });
});
